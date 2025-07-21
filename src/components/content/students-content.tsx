export function StudentsContent() {
  return (
    <div className="min-h-[100vh] flex-1 rounded-xl border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-muted-foreground mb-2">Welcome to All Students</h1>
        <p className="text-muted-foreground">Students list will be displayed here</p>
      </div>
    </div>
  )
}

export function AddStudentContent() {
  return (
    <div className="min-h-[100vh] flex-1 rounded-xl border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-muted-foreground mb-2">Welcome to Add Student</h1>
        <p className="text-muted-foreground">Add student form will be displayed here</p>
      </div>
    </div>
  )
}
