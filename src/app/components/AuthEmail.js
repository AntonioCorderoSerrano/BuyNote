import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { FaEye, FaEyeSlash, FaShoppingCart } from "react-icons/fa";

export function AuthEmail() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const saveUserToFirestore = async (user) => {
    try {
      await setDoc(doc(db, "users", user.email), {
        email: user.email,
        uid: user.uid,
        searchEmail: user.email.toLowerCase(),
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp()
      });
      console.log("Usuario guardado en Firestore correctamente con email como ID");
    } catch (error) {
      console.error("Error al guardar usuario en Firestore:", error);
      throw new Error("No se pudo completar el registro. Intenta nuevamente.");
    }
  };

  const updateLastLogin = async (user) => {
    try {
      await setDoc(doc(db, "users", user.email), {
        lastLogin: serverTimestamp(),
        uid: user.uid,
        searchEmail: user.email.toLowerCase()
      }, { merge: true });
    } catch (error) {
      console.error("Error al actualizar último login:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
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

      console.log("Intentando autenticar con:", { email, isLogin });

      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        await updateLastLogin(userCredential.user);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await saveUserToFirestore(userCredential.user);
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
      minHeight: '100vh',
      backgroundColor:"#F0F9FF",
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0',
      position: 'relative'
    }}>
      
      {/* Fondo con gradiente suave */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0.03,
        zIndex: 0
      }}></div>

      {/* Contenido principal centrado */}
      <div style={{
        width: '100%',
        maxWidth: '400px',
        padding: '40px',
        position: 'relative',
        backgroundColor:"#F0F9FF",
        zIndex: 1
      }}>
        
        <div style={{
          textAlign: 'center',
          marginBottom: '40px'
        }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '800',
            color: '#1F2937',
            margin: '0 0 8px 0',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            BuyNote
          </h1>
          <p style={{
            color: '#6B7280',
            fontSize: '16px',
            margin: 0,
            fontWeight: '500'
          }}>
            {isLogin ? "Bienvenido de vuelta" : "Crea tu cuenta"}
          </p>
        </div>

        {/* Mensaje de error */}
        {error && (
          <div style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#DC2626',
            padding: '16px',
            borderRadius: '12px',
            marginBottom: '24px',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              width: '20px',
              height: '20px',
              backgroundColor: '#DC2626',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              color: 'white',
              flexShrink: 0
            }}>
              !
            </div>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          
          {/* Campo de email */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Correo Electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@ejemplo.com"
              style={{
                width: '100%',
                padding: '16px',
                border: '1px solid #D1D5DB',
                borderRadius: '12px',
                fontSize: '16px',
                color: '#1F2937',
                backgroundColor: 'white',
                outline: 'none',
                transition: 'all 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
              onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
              required
              disabled={loading}
            />
          </div>

          {/* Campo de contraseña */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu contraseña"
                style={{
                  width: '100%',
                  padding: '16px 50px 16px 16px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '12px',
                  fontSize: '16px',
                  color: '#1F2937',
                  backgroundColor: 'white',
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
                onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                disabled={loading}
                style={{
                  position: 'absolute',
                  right: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#6B7280',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '6px',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#F3F4F6'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
              </button>
            </div>
          </div>

          {/* Botón de envío */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px',
              backgroundColor: loading ? '#9CA3AF' : '#3B82F6',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '8px',
              boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.backgroundColor = '#2563EB';
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.target.style.backgroundColor = '#3B82F6';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 15px rgba(59, 130, 246, 0.3)';
              }
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid transparent',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                {isLogin ? "Iniciando sesión..." : "Creando cuenta..."}
              </>
            ) : (
              <>
                {isLogin ? "Iniciar Sesión" : "Crear Cuenta"}
              </>
            )}
          </button>
        </form>

        {/* Toggle entre login y registro */}
        <div style={{
          textAlign: 'center',
          marginTop: '32px',
          paddingTop: '32px',
          borderTop: '1px solid #E5E7EB'
        }}>
          <button
            onClick={() => setIsLogin(!isLogin)}
            disabled={loading}
            style={{
              background: 'none',
              border: 'none',
              color: '#6B7280',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s',
              padding: '8px 16px',
              borderRadius: '8px'
            }}
            onMouseEnter={(e) => {
              e.target.style.color = '#374151';
              e.target.style.backgroundColor = '#F3F4F6';
            }}
            onMouseLeave={(e) => {
              e.target.style.color = '#6B7280';
              e.target.style.backgroundColor = 'transparent';
            }}
          >
            {isLogin ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
            <span style={{ color: '#3B82F6', fontWeight: '600' }}>
              {isLogin ? "Regístrate" : "Inicia sesión"}
            </span>
          </button>
        </div>

        {/* Información adicional */}
        <div style={{
          marginTop: '32px',
          padding: '16px',
          backgroundColor: '#F8FAFC',
          borderRadius: '12px',
          border: '1px solid #E2E8F0'
        }}>
          <p style={{
            color: '#6B7280',
            fontSize: '13px',
            textAlign: 'center',
            margin: 0,
            lineHeight: '1.5'
          }}>
            💡 <strong>Consejo:</strong> {isLogin 
              ? "Usa la misma cuenta en todos tus dispositivos para sincronizar tus listas." 
              : "Crea una contraseña segura para proteger tu cuenta."}
          </p>
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        input::placeholder {
          color: #9CA3AF !important;
          opacity: 1 !important;
        }
        
        body {
          margin: 0;
          padding: 0;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: white;
        }
        
        /* Responsive */
        @media (max-width: 480px) {
          .auth-container {
            padding: 20px;
          }
          
          .auth-logo {
            width: 80px;
            height: 80px;
            font-size: 32px;
          }
          
          .auth-title {
            font-size: 28px;
          }
        }
      `}</style>
    </div>
  );
}