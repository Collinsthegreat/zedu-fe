export type ContributorRole = "Team Lead" | "Member";

export type Contributor = {
  fullName: string;
  zeduUsername: string;
  githubUsername: string;
  role: ContributorRole;
  field?: string;
};

export type Team = {
  name: string;
  contributors: Contributor[];
};

export const TEAM: Team = {
  name: "Zedu-Sparrow",
  contributors: [
    {
      fullName: "Abraham Bishop",
      zeduUsername: "dev_b",
      githubUsername: "abrahambishopcodes",
      role: "Team Lead",
      field: "Full-Stack Software Engineer",
    },
    {
      fullName: "Denise Moemeke",
      zeduUsername: "denise_davida",
      githubUsername: "deniseondata",
      role: "Member",
      field: "[Add your field of expertise]",
    },
    {
      fullName: "Medadi God'sglory Mitana",
      zeduUsername: "God'sglory",
      githubUsername: "medadimitana",
      role: "Member",
      field: "[Add your field of expertise]",
    },
  ],
};
