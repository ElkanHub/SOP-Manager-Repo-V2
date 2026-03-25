import * as dotenv from 'dotenv'
import * as fs from 'fs'
dotenv.config({ path: '.env' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Extract project ref from URL
const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0]

async function deployMigration() {
    const sql = fs.readFileSync('./supabase/migrations/024_hotfix_approve_sop.sql', 'utf-8')
    
    console.log('Deploying hotfix migration via Supabase Management API...')
    console.log(`Project ref: ${projectRef}`)
    
    // Use the Supabase Management API to run SQL
    const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ query: sql }),
    })
    
    const text = await response.text()
    
    if (!response.ok) {
        console.log('Management API failed (expected for service_role key, which is project-scoped)')
        console.log('Status:', response.status, text)
        
        // Alternative: use the pg REST endpoint via the REST API
        console.log('\nTrying REST API approach...')
        await deployViaRestBatch(sql)
        return
    }
    
    console.log('Success:', text)
}

// The Supabase REST API doesn't support raw SQL, but we can call a stored procedure
// The best approach without the CLI is to use the Supabase URL /rest/v1/ with service role
// and an extension that allows running SQL - let's try exec_sql
async function deployViaRestBatch(sql: string) {
    // Try calling via the Postgres REST endpoint directly
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ sql }),
    })
    
    const text = await response.text()
    console.log('exec_sql response:', response.status, text)
}

deployMigration()
