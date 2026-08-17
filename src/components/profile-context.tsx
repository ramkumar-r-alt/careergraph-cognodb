import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const STORAGE_KEY = "careergraph.personId";
const DEFAULT_PERSON_ID = "p-1";

type ProfileContextValue = {
  personId: string;
  setPersonId: (id: string) => void;
};

const ProfileContext = createContext<ProfileContextValue>({
  personId: DEFAULT_PERSON_ID,
  setPersonId: () => {},
});

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [personId, setPersonId] = useState(DEFAULT_PERSON_ID);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) setPersonId(stored);
  }, []);

  const value = useMemo<ProfileContextValue>(
    () => ({
      personId,
      setPersonId: (id: string) => {
        setPersonId(id);
        window.localStorage.setItem(STORAGE_KEY, id);
      },
    }),
    [personId],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  return useContext(ProfileContext);
}