'use client'
import { useState, useEffect } from "react";
import { auth } from "./firebase";
import { AuthEmail } from "./components/AuthEmail";
import { ShoppingList } from "./components/ShoppingList";

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });
    return unsubscribe;
  }, []);

  return (
    
    <div>
      {user ? (
        <>
          <ShoppingList />
        </>
      ) : (
        <AuthEmail />
      )}
    </div>
  );
}

export default App;