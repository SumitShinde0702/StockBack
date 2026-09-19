import { AppShell } from "@/components/app-shell";
import { Providers } from "@/components/providers";

export default function Page() {
  return (
    <Providers>
      <AppShell />
    </Providers>
  );
}
