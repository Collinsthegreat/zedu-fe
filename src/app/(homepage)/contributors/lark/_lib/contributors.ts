export type Contributor = {
  name: string;
  /** Already masked — never store a full email here. */
  email?: string;
  role: string;
  avatar?: string;
};

/** Keeps the first 2 characters of the local part, e.g. no***@example.com */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  return `${local.slice(0, 2)}***@${domain}`;
}

// Generated from the ZEDU-Lark membership sheet: leads first, then A–Z.
export const larkContributors: Contributor[] = [
  { name: "Michael Abu", email: "th***@gmail.com", role: "Team Lead" },
  { name: "Alexin", email: "al***@gmail.com", role: "Technical Lead" },
  {
    name: "Aisha Yunus",
    email: "ai***@gmail.com",
    role: "Assistant Coordinator",
  },
  { name: "Canon", email: "um***@gmail.com", role: "Assistant Lead" },
  {
    name: "Chidera Nwile",
    email: "ch***@gmail.com",
    role: "Assistant Coordinator",
  },
  {
    name: "Ezeike David Chukwunonso",
    email: "da***@gmail.com",
    role: "Assistant Lead",
  },
  { name: "Abdulkareem Rukayat", email: "ab***@gmail.com", role: "Member" },
  { name: "Agnes Oreoluwa", email: "or***@gmail.com", role: "Member" },
  { name: "Aidudo Anita", email: "ai***@gmail.com", role: "Member" },
  { name: "Ajoku Kingsley Kelechi", email: "aj***@gmail.com", role: "Member" },
  { name: "Amaka Dafe", email: "am***@gmail.com", role: "Member" },
  { name: "Anthony Ifeanyi", email: "to***@gmail.com", role: "Member" },
  { name: "Anuoluwapo David", email: "th***@gmail.com", role: "Member" },
  { name: "Apata Abdulmalik", email: "ap***@gmail.com", role: "Member" },
  { name: "Ayooluwa Babatunde", email: "ba***@gmail.com", role: "Member" },
  { name: "Bruno Nweremizu", role: "Member" },
  { name: "Chukwumaeze Henry", email: "ch***@gmail.com", role: "Member" },
  { name: "Confidence Onyekachi", email: "co***@gmail.com", role: "Member" },
  { name: "Dolapo Ewulogbo", email: "do***@gmail.com", role: "Member" },
  { name: "Ebubechukwu Obi", email: "ob***@gmail.com", role: "Member" },
  { name: "Egede Kelechukwu Mark", role: "Member" },
  { name: "Ekwere Noble Nathan", email: "ek***@gmail.com", role: "Member" },
  { name: "Emmanuel Orotayo", email: "em***@gmail.com", role: "Member" },
  { name: "Evans Godwin", email: "ev***@gmail.com", role: "Member" },
  { name: "Faith Udoh", email: "fa***@gmail.com", role: "Member" },
  { name: "Gift Osanebi", email: "os***@gmail.com", role: "Member" },
  { name: "Godwin Adeosun", email: "go***@gmail.com", role: "Member" },
  { name: "Godwin Praise", email: "pr***@gmail.com", role: "Member" },
  { name: "Ifeoluwa Adeyanju", email: "if***@gmail.com", role: "Member" },
  { name: "Ismail Yunus", email: "is***@gmail.com", role: "Member" },
  { name: "Joanna Tebadda", email: "jo***@gmail.com", role: "Member" },
  { name: "Julianah Adedipe", email: "ju***@gmail.com", role: "Member" },
  { name: "Kennedy Effoh", email: "ke***@gmail.com", role: "Member" },
  { name: "Meklit Seife", email: "me***@gmail.com", role: "Member" },
  { name: "Merit Muhammed", email: "me***@gmail.com", role: "Member" },
  { name: "Michael Akor", email: "mi***@gmail.com", role: "Member" },
  { name: "Mustapha Ajibadd", email: "aj***@gmail.com", role: "Member" },
  { name: "Mustapha Kaba", email: "ol***@gmail.com", role: "Member" },
  { name: "Nie Osaoboh", email: "sl***@gmail.com", role: "Member" },
  { name: "Obi Madu", email: "ma***@obimadu.pro", role: "Member" },
  { name: "Okafor Maryjane", email: "ma***@gmail.com", role: "Member" },
  { name: "Olubunmi Elegbeleye", email: "lo***@gmail.com", role: "Member" },
  { name: "Oluchi Oraekwe", email: "ol***@gmail.com", role: "Member" },
  { name: "Olurounbi Halliday", email: "ro***@gmail.com", role: "Member" },
  { name: "Oluwateniayomi Adeniyi.", email: "te***@gmail.com", role: "Member" },
  { name: "Onyeka Prince", email: "on***@gmail.com", role: "Member" },
  { name: "Osajimere Atalor", email: "os***@gmail.com", role: "Member" },
  { name: "Paulinus Obiahu", email: "po***@gmail.com", role: "Member" },
  { name: "Peter Abah", email: "pe***@gmail.com", role: "Member" },
  { name: "Princewill jerahmeel", email: "ja***@gmail.com", role: "Member" },
  { name: "Raphael Okeke", email: "ra***@gmail.com", role: "Member" },
  { name: "Rita Ugwu", email: "th***@gmail.com", role: "Member" },
  {
    name: "Tochi-wogu Chimerenka John-Alexander",
    email: "to***@gmail.com",
    role: "Member",
  },
  { name: "Ugonwa Ohagwasi", email: "ug***@gmail.com", role: "Member" },
  { name: "Usman Abdullahi Ubale", email: "us***@gmail.com", role: "Member" },
  { name: "Yusuf Muhammad Musa", email: "yu***@gmail.com", role: "Member" },
  { name: "Zainab Rasaki", email: "ra***@gmail.com", role: "Member" },
];
