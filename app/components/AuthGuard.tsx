// import { useRouter } from "next/router";
// import { useEffect } from "react";
// import { useAuth } from "../context/AuthContext";

// export default function AuthGuard({ children }: { children: React.ReactNode }) {
//   const { user, loading } = useAuth();
//   const router = useRouter();

//   useEffect(() => {
//     if (!loading && !user) router.push("/auth/login");
//   }, [user, loading]);

//   if (loading || !user) return <div>Loading...</div>;

//   return <>{children}</>;
// }