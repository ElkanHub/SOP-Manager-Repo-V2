const SUPABASE_URL = "https://owvadkpzvuuupwkdxhkp.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93dmFka3B6dnV1dXB3a2R4aGtwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzUyMTUwNiwiZXhwIjoyMDg5MDk3NTA2fQ.R2bEsVdVCOWT1Lx8EbfoJvq01yxmyHe1C2_MfPqHl8Q";

async function check() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=signup_status,full_name`, {
        headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`
        }
    });
    const data = await res.json();
    console.log("Total Profiles:", data.length);
    console.log("Profiles:", data);
}

check();
