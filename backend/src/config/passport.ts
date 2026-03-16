import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import { User, IUser } from '../models/User';

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (googleClientId && googleClientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientId,
        clientSecret: googleClientSecret,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/web/auth/google/callback',
        scope: ['profile', 'email']
      },
      async (
        accessToken: string,
        refreshToken: string,
        profile: Profile,
        done: (error: Error | null, user?: IUser | false) => void
      ) => {
        try {
          const email = profile.emails?.[0]?.value;

          if (!email) {
            return done(new Error('No email found in Google profile'));
          }

          let user = await User.findOne({ googleId: profile.id });

          if (user) {
            return done(null, user);
          }

          user = await User.findOne({ email });

          if (user) {
            user.googleId = profile.id;
            user.profileImage = user.profileImage || profile.photos?.[0]?.value || '';
            await user.save();
            return done(null, user);
          }

          user = await User.create({
            email,
            displayName: profile.displayName || email.split('@')[0],
            profileImage: profile.photos?.[0]?.value || '',
            googleId: profile.id,
            authProvider: 'google'
          });

          return done(null, user);
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );
} else {
  console.warn('Google OAuth not configured - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET required');
}

passport.serializeUser((user: any, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

export default passport;
