import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Create a Supabase client with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // This needs to be added to your .env.local
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    const { email, role, first_name, last_name, workspace_id, student_id, parent_id, employee_id } = await request.json()

    if (!email || !role || !first_name || !last_name || !workspace_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Invite user by email (creates user and sends invitation)
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        role,
        first_name,
        last_name,
        workspace_id,
      },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`
    })

    if (error) {
      // Handle case where user already exists
      if (error.message?.includes('already been registered') || error.message?.includes('already exists')) {
        console.log('User already exists, attempting to create app_users entry only')
        
        // Try to find the existing user
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
        const existingUser = existingUsers?.users?.find(user => user.email === email)
        
        if (existingUser) {
          // Create app_users entry for existing user
          const appUserData: any = {
            id: existingUser.id,
            role,
            workspace_id,
          }

          if (role === 'student' && student_id) {
            appUserData.student_id = student_id
          } else if (role === 'parent' && parent_id) {
            appUserData.parent_id = parent_id
          } else if (role === 'tutor' && employee_id) {
            appUserData.employee_id = employee_id
          }

          const { error: appUserError } = await supabaseAdmin
            .from('app_users')
            .upsert(appUserData) // Use upsert to handle duplicates

          if (appUserError) {
            console.error('Error creating app_users entry for existing user:', appUserError)
          }

          return NextResponse.json(
            { 
              success: true, 
              user: existingUser,
              message: 'User already exists, linked to database record'
            },
            { status: 200 }
          )
        }
      }
      
      console.error('Error creating user:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    // Create app_users entry with proper foreign key relationships
    const appUserData: any = {
      id: data.user.id,
      role,
      workspace_id,
    }

    // Add foreign key relationships based on role
    if (role === 'student' && student_id) {
      appUserData.student_id = student_id
    } else if (role === 'parent' && parent_id) {
      appUserData.parent_id = parent_id
    } else if (role === 'tutor' && employee_id) {
      appUserData.employee_id = employee_id
    }

    const { error: appUserError } = await supabaseAdmin
      .from('app_users')
      .insert(appUserData)

    if (appUserError) {
      console.error('Error creating app_users entry:', appUserError)
      // Don't fail the whole process for this
    }

    // inviteUserByEmail already sends the invitation email

    return NextResponse.json(
      { 
        success: true, 
        user: data.user,
        message: 'User created and invitation sent successfully'
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
