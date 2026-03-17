import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Auth.module.css';

const Register: React.FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Create Account</h1>
        <p className={styles.subtitle}>Join FoodShare and share your meals</p>
        {/* Register form will be implemented */}
        <div className={styles.placeholder}>
          <p>Register form coming soon...</p>
        </div>
        <p className={styles.footer}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
