import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState('');
  const { login, signup, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      if (isSignup) {
        await signup(email, password);
      } else {
        await login(email, password);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-6">
        {isSignup ? 'Create Account' : 'Sign In'}
      </h2>
      
      {error && (
        <div className="bg-red-100 text-red-600 p-3 rounded-lg mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full px-4 py-2 border rounded-lg"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full px-4 py-2 border rounded-lg"
          required
        />
        <button 
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded-lg"
        >
          {isSignup ? 'Sign Up' : 'Sign In'}
        </button>
      </form>
      
      <button
        onClick={() => loginWithGoogle()}
        className="w-full mt-4 border border-gray-300 py-2 rounded-lg"
      >
        Sign in with Google
      </button>
      
      <button
        onClick={() => setIsSignup(!isSignup)}
        className="w-full mt-4 text-blue-600"
      >
        {isSignup ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
      </button>
    </div>
  );
}