import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import axios from "axios"
// import { BACKEND_URL } from "@/lib/config";

const HomePage = () => {
    const [user, setUser] = useState<null | User>(null);
    const navigate = useNavigate();


    const supabase = createClient();
    useEffect(() => {
        const getCurrentUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)
        }

        getCurrentUser();
    }, [])

    useEffect(() => {
        const getExistingConversations = async () => {
            if (user) {
                const { data: { session } } = await supabase.auth.getSession();
                const jwt = session?.access_token;

                const response = await axios.get(`http://localhost:3001/conversations`, {
                    headers: {
                        Authorization: jwt,
                    }
                })

                console.log("exisiting convo data :: ",response.data);
            }
        }

        getExistingConversations(); 
    }
        , [user])

    const logout = async () => {
        const { error } = await supabase.auth.signOut({ scope: 'local' })

        setUser(null)
        if (error) {
            console.log("An Error Occured while signing out :: ", error);
        }
    }

    return (
        <div>
            {user && (<div>
                <h1>logged in as  :: {user?.email}</h1>
                <h2>provider :: {user.app_metadata?.provider}</h2>
                <button onClick={() => logout()}>logout</button>
            </div>)}

            {!user && (<div>
                <h1>You Are Not Logged In gng</h1>
                <button onClick={() => navigate("/auth")}>Sign up</button>
            </div>)}
        </div>
    )
}

export default HomePage;