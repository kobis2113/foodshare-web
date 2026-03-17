import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { BASE_URL } from '../../services/api';
import styles from './Navbar.module.css';

const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getProfileImageUrl = (profileImage?: string) => {
    if (!profileImage) return '/default-avatar.svg';
    if (profileImage.startsWith('http')) return profileImage;
    return `${BASE_URL}${profileImage.startsWith('/') ? '' : '/'}${profileImage}`;
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <Link to={isAuthenticated ? "/" : "/login"} className={styles.logo}>
          <span className={styles.logoIcon}>🍽️</span>
          <span className={styles.logoText}>FoodShare</span>
        </Link>

        <div className={styles.navLinks}>
          {isAuthenticated ? (
            <>
              <Link to="/" className={styles.navLink}>Feed</Link>
              <Link to="/create" className={styles.navLink}>Create Post</Link>
              <Link to="/my-posts" className={styles.navLink}>My Posts</Link>
              <div className={styles.profileMenu}>
                <Link to="/profile" className={styles.profileLink}>
                  <img
                    src={getProfileImageUrl(user?.profileImage)}
                    alt={user?.displayName || 'Profile'}
                    className={styles.avatar}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/default-avatar.svg';
                    }}
                  />
                  <span className={styles.userName}>{user?.displayName}</span>
                </Link>
                <button onClick={handleLogout} className={styles.logoutBtn}>Logout</button>
              </div>
            </>
          ) : !isAuthPage && (
            <>
              <Link to="/login" className={styles.navLink}>Login</Link>
              <Link to="/register" className={styles.registerBtn}>Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
