import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { SignInPage, SignUpPage } from '../ui/sign-in';

export default function AuthPage({ setActiveTab }) {
  const [mode, setMode] = useState('signin');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState(null);

  const { signIn, signUpStudent, authError } = useAuth();

  const handleSignIn = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setLocalError(null);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email');
    const password = formData.get('password');
    try {
      const { error } = await signIn({ email, password });
      if (error) {
        setLocalError(error.message || 'Unable to sign in.');
        return;
      }
      setActiveTab('dashboard');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setLocalError(null);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email');
    const password = formData.get('password');
    const fullName = formData.get('fullName');
    try {
      const { error } = await signUpStudent({ email, password, fullName });
      if (error) {
        setLocalError(error.message || 'Unable to create account.');
        return;
      }
      setActiveTab('onboarding');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = () => {
    // Placeholder – Google sign-in not implemented yet
  };

  const handleResetPassword = () => {
    // TODO: implement reset password flow
  };

  const errorMessage = localError || authError;

  const backToLanding = () => setActiveTab('landing');

  const heroWrapperClass = 'min-h-[100dvh] w-full min-w-0 overflow-x-hidden bg-[#000] text-white relative';
  const heroGlows = (
    <>
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute top-[-15%] left-[30%] w-[120%] h-[90%] blur-[40px] opacity-60" style={{
          background: 'radial-gradient(ellipse 55% 55% at 50% 20%, rgba(155,200,175,0.22) 0%, rgba(100,165,140,0.08) 45%, transparent 70%)',
        }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[80%] h-[70%] blur-[30px] opacity-50" style={{
          background: 'radial-gradient(ellipse 60% 60% at 80% 80%, rgba(20,65,42,0.5) 0%, transparent 60%)',
        }} />
      </div>
    </>
  );

  if (mode === 'signup') {
    return (
      <div className={heroWrapperClass}>
        {heroGlows}
        <SignUpPage
          showTextLoop
          onSignUp={handleSignUp}
          onGoogleSignIn={handleGoogleSignIn}
          onSignIn={() => { setMode('signin'); setLocalError(null); }}
          onBack={backToLanding}
          error={errorMessage}
          submitting={submitting}
        />
      </div>
    );
  }

  return (
    <div className={heroWrapperClass}>
      {heroGlows}
      <SignInPage
        showTextLoop
        onSignIn={handleSignIn}
        onGoogleSignIn={handleGoogleSignIn}
        onResetPassword={handleResetPassword}
        onCreateAccount={() => { setMode('signup'); setLocalError(null); }}
        onBack={backToLanding}
        error={errorMessage}
        submitting={submitting}
      />
    </div>
  );
}
