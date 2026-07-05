/*
 * Demo seed script for the Ward Directory.
 *
 * Wipes the members/wards collections and loads a fictional YSA ward so the app
 * has something to show the moment it boots, and so the LaTeX PDF booklet
 * generates end-to-end. Also copies a per-member avatar into
 * ../photos/<member_id>.jpg (and the two booklet cover images) so nothing needs
 * to be uploaded first.
 *
 * Data shape is dictated by server/booklet.js, which is rigid:
 *   - The Bishopric page needs a Bishop, 1st Counselor, 2nd Counselor and
 *     "Assigned Stake High Counselor", each with an exact `calling` string, a
 *     `street;city` address, and a spouse sharing their last name.
 *   - The Leadership page needs a member with calling "Ward Clerks;Ward Clerk"
 *     plus a spouse.
 * Spouses and the clerk couple are marked hidden with no apartment so they only
 * feed the booklet's "His & Hers" layout and never appear in the browse UI or
 * the member listings (both of which exclude hidden / Bishopric members).
 *
 * Reuses the real Mongoose models (server/*_model.js) so the demo accounts get
 * the same bcrypt password hashing as production logins.
 *
 * Run indirectly via docker compose (the `seed` service). To run by hand:
 *   MONGO_DB_URL=... JWT_SECRET=... node seed/seed.js
 */

const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");

// Registering the models pulls in server/auth.js, which exits the process if
// JWT_SECRET is undefined. Compose provides it; fail loudly otherwise.
require(path.resolve(__dirname, "../server/member_model.js")).makeModel();
require(path.resolve(__dirname, "../server/ward_model.js")).makeModel();

const Member = mongoose.model("Member");
const Ward = mongoose.model("Ward");

const AVATAR_DIR = path.resolve(__dirname, "avatars");
const PHOTO_DIR = path.resolve(__dirname, "../photos");

// These apartment names must match server/booklet_pieces/aptnamelist.tex (the
// by-apartment booklet layout is a fixed list of a ward's apartments). The
// count is deliberately 3 so the finished booklet's page count is a multiple of
// 4, which the print-imposition step (genPages in booklet.js) requires.
const apartments = ["Maple Court 4A", "Maple Court 4B", "Cedar Ridge 12"];

// Leadership tab / booklet leadership page read this (stored as a JSON string).
const callings = {
  "Elders Quorum": { "President": null, "1st Counselor": null, "2nd Counselor": null },
  "Relief Society": { "President": null, "1st Counselor": null, "2nd Counselor": null },
  "Ward Clerks": { "Ward Clerk": null, "Membership Clerk": null },
};

// Reserved 555-01xx numbers so nothing points at a real phone.
const roster = [
  // --- Bishopric: visible leaders (apt "Bishopric", street;city addresses) ---
  { avatar: "avatar_01", firstname: "Marcus", lastname: "Whitfield", apt: "Bishopric", phone: "(801) 555-0110", email: "marcus.whitfield@example.com", address: "1420 Maplewood Dr;Provo, UT", calling: "Bishopric;Bishop" },
  { avatar: "avatar_02", firstname: "Daniel", lastname: "Osei",      apt: "Bishopric", phone: "(801) 555-0121", email: "daniel.osei@example.com",      address: "88 Cedar Ridge Ln;Provo, UT", calling: "Bishopric;1st Counselor" },
  { avatar: "avatar_03", firstname: "Samuel", lastname: "Petrov",    apt: "Bishopric", phone: "(801) 555-0132", email: "samuel.petrov@example.com",    address: "217 Birchwood Ave;Orem, UT",  calling: "Bishopric;2nd Counselor" },
  { avatar: "avatar_04", firstname: "Thomas", lastname: "Bennett",   apt: "Bishopric", phone: "(801) 555-0143", email: "thomas.bennett@example.com",   address: "540 Oakmont St;Provo, UT",    calling: "Bishopric;Assigned Stake High Counselor" },

  // --- Bishopric spouses: hidden, no apartment (booklet name lookup only) ---
  { avatar: "avatar_05", firstname: "Rachel", lastname: "Whitfield", apt: "", phone: "(801) 555-0110", email: "rachel.whitfield@example.com", hidden: true },
  { avatar: "avatar_06", firstname: "Naomi",  lastname: "Osei",      apt: "", phone: "(801) 555-0121", email: "naomi.osei@example.com",      hidden: true },
  { avatar: "avatar_07", firstname: "Elena",  lastname: "Petrov",    apt: "", phone: "(801) 555-0132", email: "elena.petrov@example.com",    hidden: true },
  { avatar: "avatar_08", firstname: "Grace",  lastname: "Bennett",   apt: "", phone: "(801) 555-0143", email: "grace.bennett@example.com",   hidden: true },

  // --- Ward Clerk couple: hidden, no apartment (feeds Leadership page) ---
  { avatar: "avatar_09", firstname: "David",  lastname: "Reyes",     apt: "", phone: "(801) 555-0150", email: "david.reyes@example.com", hidden: true, calling: "Ward Clerks;Ward Clerk" },
  { avatar: "avatar_10", firstname: "Sonia",  lastname: "Reyes",     apt: "", phone: "(801) 555-0150", email: "sonia.reyes@example.com", hidden: true },

  // --- Maple Court 4A --- (includes the demo CLERK login)
  { avatar: "avatar_11", firstname: "Demo",   lastname: "Clerk",     apt: "Maple Court 4A", phone: "(801) 555-0161", email: "clerk@warddir.demo",         permissions: 4, password: "demo1234" },
  { avatar: "avatar_12", firstname: "Emily",  lastname: "Nakamura",  apt: "Maple Court 4A", phone: "(801) 555-0172", email: "emily.nakamura@example.com", calling: "Relief Society;President" },
  { avatar: "avatar_13", firstname: "Jordan", lastname: "Blake",     apt: "Maple Court 4A", phone: "(801) 555-0183", email: "jordan.blake@example.com",   calling: "Elders Quorum;President" },
  { avatar: "avatar_16", firstname: "Aisha",  lastname: "Mohammed",  apt: "Maple Court 4A", phone: "(801) 555-0216", email: "aisha.mohammed@example.com" },

  // --- Maple Court 4B ---
  { avatar: "avatar_14", firstname: "Sophia", lastname: "Rossi",     apt: "Maple Court 4B", phone: "(801) 555-0194", email: "sophia.rossi@example.com",   calling: "Relief Society;1st Counselor" },
  { avatar: "avatar_15", firstname: "Liam",   lastname: "OConnor",   apt: "Maple Court 4B", phone: "(801) 555-0205", email: "liam.oconnor@example.com" },
  { avatar: "avatar_18", firstname: "Noah",   lastname: "Kim",       apt: "Maple Court 4B", phone: "(801) 555-0238", email: "noah.kim@example.com",       calling: "Elders Quorum;1st Counselor" },
  { avatar: "avatar_19", firstname: "Grace",  lastname: "Abara",     apt: "Maple Court 4B", phone: "(801) 555-0249", email: "grace.abara@example.com" },

  // --- Cedar Ridge 12 --- (includes the read-only MEMBER login; Maya is hidden, to show the hide feature)
  { avatar: "avatar_17", firstname: "Demo",   lastname: "Member",    apt: "Cedar Ridge 12", phone: "(801) 555-0227", email: "member@warddir.demo",        permissions: 0, password: "demo1234" },
  { avatar: "avatar_20", firstname: "Olivia", lastname: "Chen",      apt: "Cedar Ridge 12", phone: "(801) 555-0260", email: "olivia.chen@example.com" },
  { avatar: "avatar_21", firstname: "Ethan",  lastname: "Ramirez",   apt: "Cedar Ridge 12", phone: "(801) 555-0271", email: "ethan.ramirez@example.com" },
  { avatar: "avatar_22", firstname: "Maya",   lastname: "Patel",     apt: "Cedar Ridge 12", phone: "(801) 555-0282", email: "maya.patel@example.com", hidden: true },
];

// Cover images referenced by the booklet templates (front / back covers).
const coverImages = ["emptytomb.jpg", "presnelson.jpg"];

async function main() {
  const url = process.env.MONGO_DB_URL;
  if (!url) {
    console.error("MONGO_DB_URL is not set. Aborting seed.");
    process.exit(1);
  }

  await mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log("Connected to MongoDB. Reseeding demo data...");

  // Fresh start every run so the demo is always in a known-good state.
  await Member.deleteMany({});
  await Ward.deleteMany({});

  const ward = new Ward({
    name: "Sunrise",
    apartments: apartments,
    callings: JSON.stringify(callings),
  });
  await ward.save();
  const wardId = ward._id.toString();

  for (const person of roster) {
    const member = new Member({
      firstname: person.firstname,
      lastname: person.lastname,
      email: person.email,
      phone: person.phone,
      apt: person.apt,
      address: person.address || "",
      calling: person.calling || "",
      photo: 1, // >0 so the front-end serves /photos/<id>.jpg instead of the fallback
      permissions: person.permissions || 0,
      password: person.password || "", // pre-save hook hashes non-empty passwords
      ward: wardId,
      hidden: !!person.hidden,
    });
    await member.save(); // triggers bcrypt hashing for the demo accounts

    copyImage(`${person.avatar}.jpg`, `${member._id.toString()}.jpg`);
  }

  // Booklet cover art (front/back covers reference these by name).
  for (const cover of coverImages) {
    copyImage(cover, cover);
  }

  console.log(`Seeded 1 ward ("${ward.name}") and ${roster.length} members.`);
  console.log("Demo logins:");
  console.log("  Clerk  (full access): clerk@warddir.demo  / demo1234");
  console.log("  Member (read-only):   member@warddir.demo / demo1234");

  await mongoose.disconnect();
  process.exit(0);
}

function copyImage(srcName, destName) {
  const src = path.join(AVATAR_DIR, srcName);
  const dest = path.join(PHOTO_DIR, destName);
  try {
    fs.mkdirSync(PHOTO_DIR, { recursive: true });
    fs.copyFileSync(src, dest);
  } catch (error) {
    console.warn(`Could not copy image ${srcName} -> ${destName}: ${error.message}`);
  }
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
