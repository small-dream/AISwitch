import type { TranslationKey } from './zh-CN'

/**
 * 英文词典：Record<TranslationKey, string> 保证与中文词典逐 key 对齐，
 * 缺失或多余的词条都会在编译期报错。
 */
export const en: Record<TranslationKey, string> = {
  // Common
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.saving': 'Saving…',
  'common.close': 'Close',
  'common.next': 'Next',
  'common.back': 'Back',
  'common.loading': 'Loading…',
  'common.delete': 'Delete',
  'common.restore': 'Restore',
  'common.edit': 'Edit',
  'common.unknownError': 'An unknown error occurred',

  // Header
  'header.toggleTheme': 'Toggle theme',
  'header.toggleLang': 'Switch language',
  'shortcut.noPresetToSwitch': 'No other preset is available to switch to',
  'shortcut.switchedTo': 'Switched to {name}',
  'template.pickerLabel': 'Fill from provider template',
  'template.placeholder': 'Choose a template…',
  'template.local': 'Local model',
  'presetRow.localModel': 'Local model · No key required',
  'update.check': 'Check for updates',
  'update.checking': 'Checking…',
  'update.checkHint': 'Check for and download the latest version',
  'update.available': 'Update to v{version}',
  'update.ready': 'Update downloaded; click to install',
  'update.installing': 'Updating…',
  'update.latest': 'You are up to date',
  'update.checkFailed': 'Could not check for or download the update. Try again later.',
  'update.installFailed': 'Update failed; try again later',
  'scope.label': 'Configuration scope',
  'scope.global': 'Global',
  'scope.project': 'Project',
  'project.title': 'Project configuration',
  'project.priority':
    'Project configuration takes precedence over global settings. Use a HOME-relative path.',
  'project.directory': 'Project directory',
  'project.directoryPlaceholder': 'e.g. work/my-repo',
  'project.chooseDirectory': 'Choose project directory',
  'project.choosingDirectory': 'Opening directory picker…',
  'project.changeDirectory': 'Change',
  'project.preset': 'Project preset',
  'project.apply': 'Write project config',
  'project.applying': 'Writing…',
  'project.active': 'Project configuration detected; it overrides global settings.',
  'project.failed': 'Write failed:',
  'project.records': 'Configured projects',
  'project.remove': 'Remove config',
  'project.confirmRemove': 'Click again to confirm',
  'project.removing': 'Removing…',

  // Error boundary
  'errorBoundary.title': 'Something went wrong',
  'errorBoundary.reload': 'Reload',

  // Password input
  'password.show': 'Show key',
  'password.hide': 'Hide key',

  // Preset panel
  'switchPanel.title': 'Model Presets',
  'switchPanel.importCurrent': 'Import current config',
  'switchPanel.importing': 'Importing…',
  'switchPanel.createPreset': 'New preset',
  'presetList.emptyTitle': 'No presets yet',
  'presetList.emptyDescription':
    'Click "New preset" in the top-right to create your first reusable model profile',

  // Preset row
  'presetRow.active': 'Active',
  'presetRow.test': 'Test',
  'presetRow.testing': 'Testing…',
  'presetRow.apply': 'Apply',
  'presetRow.applying': 'Switching…',
  'presetRow.confirmDelete': 'Delete?',
  'presetRow.deleted': 'Preset deleted',
  'presetRow.duplicate': 'Duplicate',
  'presetRow.switchedTo': 'Switched to {name}',
  'connectivity.ok': 'OK ({latency}ms)',
  'connectivity.invalidKey': 'API key invalid or unauthorized',
  'connectivity.unreachable': 'Unreachable',
  'connectivity.unsupported': 'This provider cannot be probed; switch to verify directly',

  // Tool status cards
  'status.installed': 'Configured',
  'status.notConfigured': 'No config detected',
  'status.unknown': 'Unknown status',
  'status.vscodeDetected': 'VS Code extension detected; changes apply after the next switch',
  'status.firstSwitchHint':
    'The first switch will create the global config automatically; the VS Code extension setup works the same way',

  // Backups
  'backups.manage': 'Backups',
  'backups.restoreLatest': 'Restore latest backup',
  'backups.restoredEntry': 'Restored {name}',
  'backups.restoredLatest': 'Restored the latest backup',
  'backups.noneAvailable': 'No backup available',
  'backups.empty': 'No backups yet',

  // One-click restore
  'restore.buttonTitle': 'Restore to pre-install state',
  'restore.dialogTitle': 'Restore to pre-install state',
  'restore.warning':
    'This will restore the Claude Code and Codex CLI configs to the state before AISwitch was installed. This cannot be undone. Your presets, keys and backups are kept in ~/.aiswitch, untouched.',
  'restore.analyzing': 'Analyzing configs…',
  'restore.baselineFound': 'Pre-install baseline detected; an exact restore is available',
  'restore.baselineMissing': 'No pre-install baseline; an approximate restore will be attempted',
  'restore.nothingToDo':
    'Nothing to restore — your tool configs already match the pre-install state.',
  'restore.confirmPromptPrefix': 'Type',
  'restore.confirmPromptSuffix': 'to confirm:',
  'restore.confirmWord': 'Restore',
  'restore.confirmAria': 'Type {word} to confirm',
  'restore.confirmButton': 'Restore now',
  'restore.confirming': 'Restoring…',
  'restore.successToast': 'Restored to the state before AISwitch was installed',
  'restore.partialToast': 'Some files could not be restored; see the results for details',
  'restore.resultSuccess': 'Restored to the state before AISwitch was installed.',
  'restore.resultPartial': 'Some files could not be restored; details below:',
  'restore.action.restoreBaseline': 'Restore pre-install content',
  'restore.action.restoreEarliestBackup': 'Restore earliest backup (approximate)',
  'restore.action.stripManagedKeys': 'Remove keys written by AISwitch',
  'restore.action.delete': 'Delete (absent before install)',
  'restore.action.keep': 'Skip',

  // Preset form
  'presetForm.title.edit': 'Edit preset',
  'presetForm.title.import': 'Import config as preset',
  'presetForm.title.duplicate': 'Duplicate preset',
  'presetForm.title.create': 'New preset',
  'presetForm.targetTool': 'Target tool',
  'presetForm.name': 'Preset name',
  'presetForm.namePlaceholder': 'e.g. GLM-4.6',
  'presetForm.provider': 'Provider name',
  'presetForm.providerPlaceholder': 'e.g. Zhipu GLM',
  'presetForm.baseUrl': 'Base URL (empty = official API)',
  'presetForm.model': 'Model name',
  'presetForm.modelPlaceholder': 'e.g. glm-4.6',
  'presetForm.smallFast': 'Small model ANTHROPIC_SMALL_FAST_MODEL (optional)',
  'presetForm.smallFastPlaceholder': 'e.g. glm-4.6-air',
  'presetForm.metadataSectionTitle':
    'Advanced: model catalog entry (optional; only needed for Codex third-party models)',
  'presetForm.metadataHint':
    'Paste a single entry from the provider, or a whole models.json file (stored as-is; after switching, all models of the family appear in the Codex picker). Codex uses it for context window and other model metadata; leave empty to fall back to the built-in catalog. It must contain an entry matching the model name (a missing slug is filled in automatically on save).',
  'presetForm.metadataLabel': 'Model metadata JSON',
  'presetForm.draftKeyNotice':
    'The API key was read from your local config. On save it will be written to ~/.aiswitch/presets.json (readable only by the current user).',
  'presetForm.duplicateKeyNotice':
    'The API key was copied from the original preset. On save it will be written to ~/.aiswitch/presets.json (readable only by the current user).',
  'presetForm.updated': 'Preset updated',
  'presetForm.created': 'Preset created',

  // Bundles
  'bundle.title': 'Bundle Switch',
  'bundle.title.create': 'New bundle',
  'bundle.title.edit': 'Edit bundle',
  'bundle.create': 'New bundle',
  'bundle.empty': 'No bundles yet. Create one to switch Claude Code and Codex CLI at once',
  'bundle.name': 'Bundle name',
  'bundle.namePlaceholder': 'e.g. Budget GLM everywhere',
  'bundle.noSwitch': 'No switch',
  'bundle.apply': 'Apply',
  'bundle.switching': 'Switching…',
  'bundle.atLeastOne': 'Select at least one tool preset',
  'bundle.confirmDelete': 'Delete this bundle?',
  'bundle.deleted': 'Bundle deleted',
  'bundle.created': 'Bundle created',
  'bundle.updated': 'Bundle updated',
  'bundle.switchedAll': 'Switched {name} ({count} tools)',
  'bundle.switchFailed': '{tool} failed to switch, see details',

  // Form validation (Zod)
  'validation.urlInvalid': 'Enter a valid URL or leave it empty',
  'validation.urlScheme':
    'Only https URLs are allowed; http is limited to loopback (localhost / 127.0.0.1 / [::1])',
  'validation.nameRequired': 'Preset name is required',
  'validation.providerRequired': 'Provider name is required',
  'validation.apiKeyRequired': 'API key is required',
  'validation.modelRequired': 'Model name is required',
  'validation.maxLength': 'At most 100 characters',

  // Model metadata parsing
  'metadata.notJson': 'Not valid JSON',
  'metadata.notObject': 'Must be a JSON object (a single entry or a whole models.json file)',
  'metadata.noMatch': 'Parsed as a whole file, but no entry matches the model name "{model}"',
  'metadata.slugMismatch':
    'Entry slug "{slug}" must match the model name "{model}" (or remove the slug field; it is filled in automatically on save)',

  // Tray / desktop notifications
  'tray.presetFallback': 'Preset',
  'tray.switchedTo': 'Switched to {name}',
  'tray.switchFailed': 'Switch failed: {message}',
  'tray.showMain': 'Show main window',
  'tray.quit': 'Quit',
  'tray.noPresets': 'No presets yet',
  'tray.tooltip': 'AISwitch · Quick model switching from the menu',
}
