import { NextResponse } from "next/server"
import { initializeDatabase } from "@/lib/database-init"

export async function POST() {
  try {
    await initializeDatabase()
    
    return NextResponse.json({ 
      success: true,
      message: "Database initialized successfully"
    })
  } catch (error) {
    console.error("Database initialization failed:", error)
    return NextResponse.json({ 
      error: "Database initialization failed",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
