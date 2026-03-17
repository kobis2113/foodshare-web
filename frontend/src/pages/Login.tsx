import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Auth.module.css';

const Login: React.FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Welcome Back</h1>
        <p className={styles.subtitle}>Sign in to continue to FoodShare</p>
        {/* Login form will be implemented */}
        <div className={styles.placeholder}>
          <p>Login form coming soon...</p>
        </div>
        <p className={styles.footer}>
          Don't have an account? <Link to="/register">Sign up</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
