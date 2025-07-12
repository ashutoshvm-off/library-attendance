export interface ConfigStatus {
  isConfigured: boolean
  missingVars: string[]
  recommendations: string[]
}

export function checkAppwriteConfig(): ConfigStatus {
  const requiredVars = [
    'NEXT_PUBLIC_APPWRITE_ENDPOINT',
    'NEXT_PUBLIC_APPWRITE_PROJECT_ID',
    'NEXT_PUBLIC_APPWRITE_DATABASE_ID',
    'NEXT_PUBLIC_APPWRITE_RECORDS_COLLECTION_ID',
    'NEXT_PUBLIC_APPWRITE_STUDENTS_COLLECTION_ID',
    'NEXT_PUBLIC_APPWRITE_STAFF_COLLECTION_ID',
    'NEXT_PUBLIC_APPWRITE_LOGIN_RECORDS_COLLECTION_ID'
  ]

  const missingVars: string[] = []
  const recommendations: string[] = []

  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName)
    }
  })

  if (missingVars.length > 0) {
    recommendations.push("Create a .env.local file in your project root")
    recommendations.push("Add the missing environment variables")
    recommendations.push("Restart your development server after adding variables")
    
    if (missingVars.includes('NEXT_PUBLIC_APPWRITE_ENDPOINT')) {
      recommendations.push("Set NEXT_PUBLIC_APPWRITE_ENDPOINT to: https://cloud.appwrite.io/v1")
    }
    
    if (missingVars.includes('NEXT_PUBLIC_APPWRITE_PROJECT_ID')) {
      recommendations.push("Get your project ID from the Appwrite console")
    }
  }

  return {
    isConfigured: missingVars.length === 0,
    missingVars,
    recommendations
  }
}

export function logConfigStatus(): void {
  const status = checkAppwriteConfig()
  
  if (status.isConfigured) {
    console.log("✅ Appwrite configuration complete")
  } else {
    console.warn("⚠️ Appwrite configuration incomplete")
    console.warn("Missing variables:", status.missingVars)
    console.warn("Recommendations:")
    status.recommendations.forEach(rec => console.warn(`  - ${rec}`))
  }
}
