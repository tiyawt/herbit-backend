// src/config/passport.js
import dotenv from "dotenv";
dotenv.config();

import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import User from "../models/user.js";
import AuthCredential from "../models/AuthCredential.js";

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, OAUTH_REDIRECT_BASE, JWT_SECRET } =
  process.env;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env");
}

if (!JWT_SECRET) {
  throw new Error("Missing JWT_SECRET in .env");
}

const callbackURL = `${
  OAUTH_REDIRECT_BASE || "http://localhost:5000"
}/api/auth/oauth/google/callback`;

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value?.toLowerCase();
        if (!email) return done(new Error("NO_EMAIL_FROM_GOOGLE"));
        
        let user = await User.findOne({ email });
        if (!user) {
          user = await User.create({
            email,
            username: (profile.displayName || email.split("@")[0])
              .replace(/\s+/g, "")
              .toLowerCase(),
            photo_url: profile.photos?.[0]?.value || null,
          });
        }
        
        let cred = await AuthCredential.findOne({ user_id: user._id });
        if (!cred) {
          cred = await AuthCredential.create({
            user_id: user._id,
            provider: "google",
            provider_id: profile.id,
            password_hash: null,
          });
        } else if (!cred.provider || !cred.provider_id) {
          cred.provider = "google";
          cred.provider_id = profile.id;
          await cred.save();
        }
        
        return done(null, user);
      } catch (e) {
        return done(e, null);
      }
    }
  )
);

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromExtractors([
    (req) => req?.cookies?.access_token,
    ExtractJwt.fromAuthHeaderAsBearerToken(),
  ]),
  secretOrKey: JWT_SECRET,
};

passport.use(
  new JwtStrategy(jwtOptions, async (jwt_payload, done) => {
    try {
      const user = await User.findById(jwt_payload.id);
      
      if (user) {
        return done(null, user);
      }
      
      return done(null, false);
    } catch (err) {
      return done(err, false);
    }
  })
);

export default passport;