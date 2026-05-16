import { Outlet } from "react-router-dom";
import { Footer } from "./Footer";
import { PublicHeader } from "./PublicHeader";

/**
 * Layout-Wrapper für öffentliche Routen: minimaler Header + Footer.
 * Im Gegensatz zu <AppShell> gibt es hier keine Sidebar und keinen
 * Login-Guard — Login/Signup/Landing/Pricing müssen ja ohne Session
 * erreichbar sein.
 */
export function PublicShell() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
