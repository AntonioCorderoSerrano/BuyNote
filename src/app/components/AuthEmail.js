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
    try {
      setLoading(true);
      setError(null);

      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="auth-container">
      <div className="auth-overlay"></div>
      <div className="auth-card">
        <h2 className="auth-title">{isLogin ? "Iniciar sesión" : "Registrarse"}</h2>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <div className="input-container">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Correo electrónico"
                className="auth-input"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="input-group">
            <div className="input-container password-container">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                className="auth-input"
                required
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={togglePasswordVisibility}
                disabled={loading}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="auth-button"
            disabled={loading}
          >
            {loading ? (
              <span className="auth-spinner">⏳</span>
            ) : isLogin ? (
              "Ingresar"
            ) : (
              "Crear cuenta"
            )}
          </button>
        </form>

        <button
          onClick={() => setIsLogin(!isLogin)}
          className="auth-toggle"
          disabled={loading}
        >
          {isLogin ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
        </button>
      </div>

      <style jsx>{`
        :root {
          --primary-blue: #1e88e5;
          --dark-blue: #0d47a1;
          --light-blue: #bbdefb;
          --white: #ffffff;
          --gray: #f5f5f5;
          --dark-gray: #757575;
          --error-red: #f44336;
        }
        
        .auth-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          background-image: url('https://images.unsplash.com/photo-1606787366850-de6330128bfc?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          z-index: 0;
          padding: 20px;
          box-sizing: border-box;
        }

        .auth-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.4);
          z-index: 1;
        }

        .auth-card {
          background-color: rgba(255, 255, 255, 0.95);
          padding: 2.5rem;
          border-radius: 12px;
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.15);
          width: 100%;
          max-width: 450px;
          z-index: 2;
          position: relative;
        }
        
        .auth-title {
          color: var(--dark-blue);
          text-align: center;
          margin-bottom: 2rem;
          font-size: 1.8rem;
          font-weight: 600;
        }
        
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        
        .input-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .input-container {
          position: relative;
          width: 100%;
        }

        .password-container {
          display: flex;
          align-items: center;
        }
        
        .auth-input {
          padding: 1rem;
          border: 1px solid var(--light-blue);
          border-radius: 8px;
          font-size: 1rem;
          transition: all 0.3s ease;
          background-color: rgba(255, 255, 255, 0.9);
          width: 100%;
          box-sizing: border-box;
          height: 48px;
        }

        .password-container .auth-input {
          padding-right: 3rem;
        }

        .password-toggle {
          position: absolute;
          right: 1rem;
          background: none;
          border: none;
          color: var(--dark-gray);
          cursor: pointer;
          padding: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          height: 100%;
        }

        .password-toggle:hover {
          color: var(--primary-blue);
        }

        .password-toggle:disabled {
          color: var(--gray);
          cursor: not-allowed;
        }
        
        .auth-input:focus {
          outline: none;
          border-color: var(--primary-blue);
          box-shadow: 0 0 0 2px rgba(30, 136, 229, 0.2);
        }
        
        .auth-input::placeholder {
          color: var(--dark-gray);
          opacity: 0.7;
        }
        
        .auth-button {
          background-color: var(--primary-blue);
          color: white;
          border: none;
          padding: 1rem;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 0.5rem;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 0.5rem;
          height: 48px;
        }
        
        .auth-button:hover {
          background-color: var(--dark-blue);
        }
        
        .auth-button:disabled {
          background-color: var(--dark-gray);
          cursor: not-allowed;
        }
        
        .auth-spinner {
          display: inline-block;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .auth-toggle {
          background: none;
          border: none;
          color: var(--primary-blue);
          cursor: pointer;
          font-size: 0.9rem;
          margin-top: 1.5rem;
          text-align: center;
          width: 100%;
          padding: 0.5rem;
          transition: all 0.3s ease;
          font-weight: 500;
        }
        
        .auth-toggle:hover {
          text-decoration: underline;
        }
        
        .auth-toggle:disabled {
          color: var(--dark-gray);
          cursor: not-allowed;
          text-decoration: none;
        }
        
        .auth-error {
          color: var(--error-red);
          background-color: rgba(244, 67, 54, 0.1);
          padding: 0.75rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
          text-align: center;
          font-size: 0.9rem;
          font-weight: 500;
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
  );
}