import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "firebase/auth";
import { auth } from "../firebase";
import { FaEye, FaEyeSlash } from "react-icons/fa";

export function AuthEmail() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validación mejorada
    if (!email.trim()) {
      setError("Por favor ingresa tu correo electrónico");
      return;
    }
    
    if (!password.trim()) {
      setError("Por favor ingresa tu contraseña");
      return;
    }
  
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Por favor ingresa un correo electrónico válido");
      return;
    }
  
    try {
      setLoading(true);
      setError(null);
  
      console.log("Intentando autenticar con:", { email, isLogin }); // Log sin password por seguridad
  
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      console.error("Error completo:", error);
      
      switch (error.code) {
        case "auth/wrong-password":
          setError("Contraseña incorrecta. Por favor, inténtalo de nuevo.");
          break;
        case "auth/user-not-found":
          setError("No existe una cuenta con este correo electrónico.");
          break;
        case "auth/invalid-credential":
          setError("Credenciales inválidas. Verifica tu correo y contraseña.");
          break;
        case "auth/email-already-in-use":
          setError("Este correo ya está registrado. Inicia sesión o usa otro correo.");
          break;
        case "auth/weak-password":
          setError("La contraseña debe tener al menos 6 caracteres.");
          break;
        case "auth/too-many-requests":
          setError("Demasiados intentos fallidos. Intenta más tarde o restablece tu contraseña.");
          break;
        default:
          setError(`Error durante la autenticación: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundImage: 'url(https://images.unsplash.com/photo-1606787366850-de6330128bfc?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      zIndex: 0,
      padding: '20px',
      boxSizing: 'border-box'
    }}>

      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        zIndex: 1
      }}></div>
      
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: '2.5rem',
        borderRadius: '12px',
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.15)',
        width: '100%',
        maxWidth: '450px',
        zIndex: 2,
        position: 'relative'
      }}>
        <h2 style={{
          color: '#0d47a1',
          textAlign: 'center',
          marginBottom: '2rem',
          fontSize: '1.8rem',
          fontWeight: 600
        }}>{isLogin ? "Iniciar sesión" : "Registrarse"}</h2>

        {error && <div style={{
          color: '#f44336',
          backgroundColor: 'rgba(244, 67, 54, 0.1)',
          padding: '0.75rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          textAlign: 'center',
          fontSize: '0.9rem',
          fontWeight: 500
        }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            <div style={{
              position: 'relative',
              width: '100%'
            }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Correo electrónico"
                style={{
                  padding: '1rem',
                  border: '1px solid #bbdefb',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  width: '100%',
                  boxSizing: 'border-box',
                  height: '48px',
                  color: 'black',
                  outline: 'none'
                }}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            <div style={{
              position: 'relative',
              width: '100%',
              display: 'flex',
              alignItems: 'center'
            }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                style={{
                  padding: '1rem 3rem 1rem 1rem',
                  border: '1px solid #bbdefb',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  width: '100%',
                  boxSizing: 'border-box',
                  height: '48px',
                  color: 'black',
                  outline: 'none'
                }}
                required
                disabled={loading}
              />
              <button
                type="button"
                style={{
                  position: 'absolute',
                  right: '1rem',
                  background: 'none',
                  border: 'none',
                  color: '#757575',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease',
                  height: '100%'
                }}
                onClick={togglePasswordVisibility}
                disabled={loading}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            style={{
              backgroundColor: '#1e88e5',
              color: 'white',
              border: 'none',
              padding: '1rem',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              marginTop: '0.5rem',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '0.5rem',
              height: '48px'
            }}
            disabled={loading}
          >
            {loading ? (
              <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
            ) : isLogin ? (
              "Ingresar"
            ) : (
              "Crear cuenta"
            )}
          </button>
        </form>

        <button
          onClick={() => setIsLogin(!isLogin)}
          style={{
            background: 'none',
            border: 'none',
            color: '#1e88e5',
            cursor: 'pointer',
            fontSize: '0.9rem',
            marginTop: '1.5rem',
            textAlign: 'center',
            width: '100%',
            padding: '0.5rem',
            transition: 'all 0.3s ease',
            fontWeight: 500
          }}
          disabled={loading}
        >
          {isLogin ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
        </button>

        <style jsx global>{`
          input::placeholder {
            color: #757575 !important;
            opacity: 0.7 !important;
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          @media (max-width: 480px) {
            .auth-card {
              padding: 1.5rem;
            }
            
            .auth-title {
              font-size: 1.5rem;
              margin-bottom: 1.5rem;
            }

            .auth-form {
              gap: 1.25rem;
            }

            .auth-input {
              padding: 0.875rem;
              height: 44px;
            }

            .auth-button {
              height: 44px;
            }
          }

          @media (max-width: 360px) {
            .auth-card {
              padding: 1.25rem;
            }
            
            .auth-title {
              font-size: 1.3rem;
            }
          }
        `}</style>
      </div>
    </div>
  );
}