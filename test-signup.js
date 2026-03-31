const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://owvadkpzvuuupwkdxhkp.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93dmFka3B6dnV1dXB3a2R4aGtwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzUyMTUwNiwiZXhwIjoyMDg5MDk3NTA2fQ.R2bEsVdVCOWT1Lx8EbfoJvq01yxmyHe1C2_MfPqHl8Q";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function test() {
    const email = `test_pending_${Date.now()}@example.com`;
    console.log("Creating user:", email);
    
    // Create user in auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: "Password123!",
        email_confirm: true,
        user_metadata: {
            full_name: "Test Pending User"
        }
    });
    
    if (authError) {
        console.error("Auth Error:", authError);
        return;
    }
    
    console.log("User created in auth:", authData.user.id);
    
    // Wait a bit for trigger
    await new Promise(r => setTimeout(r, 2000));
    
    // Check profile
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();
        
    if (profileError) {
        console.error("Profile Error:", profileError);
    } else {
        console.log("Profile created:", profile);
    }
    
    // Cleanup - delete user
    // await supabase.auth.admin.deleteUser(authData.user.id);
}

test();
