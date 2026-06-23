import { createClient } from '@/lib/supabase/client';
import { type Provider } from '@supabase/supabase-js';
import { useNavigate } from 'react-router';

const supabase = createClient();

export default function Auth() {
    const navigate = useNavigate();

    const login = async (provider: "google" | "github") => {

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: provider,
        });
        console.log("login data :: ",data);
        console.log("error data :: ", error);
    }

    return <div>   
        <button onClick={() => login("github")}>Login With Github</button>
        <button onClick={() => login("google")}>Login With Google</button>
        <button onClick={() => navigate("/")}>Go Home</button>
    </div>
}