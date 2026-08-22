export function projectApplyDisabled(
  projectPath: string,
  presetId: string,
  isPending: boolean
): boolean {
  return projectPath.trim() === '' || presetId === '' || isPending
}
