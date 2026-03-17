import React from 'react';
import styles from './Home.module.css';

const Home: React.FC = () => {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Welcome to FoodShare</h1>
      <p className={styles.subtitle}>Share your favorite meals with the community</p>
      {/* Feed will be implemented here */}
      <div className={styles.placeholder}>
        <p>Feed coming soon...</p>
      </div>
    </div>
  );
};

export default Home;
