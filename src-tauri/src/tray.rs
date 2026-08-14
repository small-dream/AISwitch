use serde::Deserialize;
use tauri::menu::{Menu, MenuBuilder, MenuItem, Submenu};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Emitter, Manager};

pub const TRAY_ID: &str = "main-tray";
pub const TRAY_SWITCH_EVENT: &str = "tray://switch";
const SWITCH_PREFIX: &str = "switch:";

#[derive(Deserialize)]
pub struct TrayPresetItem {
    pub id: String,
    pub name: String,
}

#[derive(Deserialize)]
pub struct TraySection {
    pub tool: String,
    pub label: String,
    pub presets: Vec<TrayPresetItem>,
}

#[derive(Deserialize, Default)]
pub struct TraySectionsPayload {
    pub sections: Vec<TraySection>,
}

#[derive(serde::Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct SwitchPayload {
    tool: String,
    preset_id: String,
}

/// 显示并聚焦主窗口（托盘「显示主窗口」/ 单实例重复启动共用）
pub fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

/// 应用启动时创建托盘（初始菜单为空分区，随后由前端推送重建）
pub fn init_tray(app: &AppHandle) -> tauri::Result<()> {
    let menu = build_menu(app, &TraySectionsPayload::default())?;
    TrayIconBuilder::with_id(TRAY_ID)
        .icon(app.default_window_icon().expect("缺少应用图标").clone())
        .tooltip("JakeAITools · 点击菜单快捷切换模型")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(handle_menu_event)
        .build(app)?;
    Ok(())
}

/// 前端推送最新预设列表后重建托盘菜单
pub fn apply_update(app: &AppHandle, payload: &TraySectionsPayload) -> tauri::Result<()> {
    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        tray.set_menu(Some(build_menu(app, payload)?))?;
    }
    Ok(())
}

fn build_menu(app: &AppHandle, payload: &TraySectionsPayload) -> tauri::Result<Menu<tauri::Wry>> {
    let mut builder = MenuBuilder::new(app);
    for section in &payload.sections {
        builder = builder.item(&build_section(app, section)?);
    }
    builder
        .separator()
        .item(&MenuItem::with_id(
            app,
            "show",
            "显示主窗口",
            true,
            None::<&str>,
        )?)
        .item(&MenuItem::with_id(
            app,
            "quit",
            "退出",
            true,
            None::<&str>,
        )?)
        .build()
}

fn build_section(app: &AppHandle, section: &TraySection) -> tauri::Result<Submenu<tauri::Wry>> {
    let submenu = Submenu::with_id(app, &section.tool, &section.label, true)?;
    if section.presets.is_empty() {
        submenu.append(&MenuItem::with_id(
            app,
            "noop",
            "暂无预设",
            false,
            None::<&str>,
        )?)?;
    }
    for preset in &section.presets {
        let id = format!("{SWITCH_PREFIX}{}:{}", section.tool, preset.id);
        submenu.append(&MenuItem::with_id(app, id, &preset.name, true, None::<&str>)?)?;
    }
    Ok(submenu)
}

fn handle_menu_event(app: &AppHandle, event: tauri::menu::MenuEvent) {
    let id = event.id().as_ref();
    match id {
        "show" => show_main_window(app),
        "quit" => app.exit(0),
        other => {
            if let Some(payload) = parse_switch(other) {
                let _ = app.emit(TRAY_SWITCH_EVENT, payload);
            }
        }
    }
}

/// 解析 "switch:<tool>:<presetId>" 菜单项 id
fn parse_switch(id: &str) -> Option<SwitchPayload> {
    let rest = id.strip_prefix(SWITCH_PREFIX)?;
    let (tool, preset_id) = rest.split_once(':')?;
    if tool.is_empty() || preset_id.is_empty() {
        return None;
    }
    Some(SwitchPayload {
        tool: tool.to_string(),
        preset_id: preset_id.to_string(),
    })
}
