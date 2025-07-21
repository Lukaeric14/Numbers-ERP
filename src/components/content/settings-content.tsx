export function GeneralSettingsContent() {
  return (
    <div className="min-h-[100vh] flex-1 rounded-xl border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-muted-foreground mb-2">Welcome to General Settings</h1>
        <p className="text-muted-foreground">General settings will be displayed here</p>
      </div>
    </div>
  )
}

export function UsersSettingsContent() {
  return (
    <div className="min-h-[100vh] flex-1 rounded-xl border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-muted-foreground mb-2">Welcome to Users Settings</h1>
        <p className="text-muted-foreground">User management will be displayed here</p>
      </div>
    </div>
  )
}

export function PreferencesSettingsContent() {
  return (
    <div className="min-h-[100vh] flex-1 rounded-xl border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-muted-foreground mb-2">Welcome to Preferences Settings</h1>
        <p className="text-muted-foreground">Preferences will be displayed here</p>
      </div>
    </div>
  )
}
