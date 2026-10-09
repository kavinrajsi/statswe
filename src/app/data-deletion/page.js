import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { LegalPage, Section } from "@/components/legal-page";
import { readSession, SESSION_COOKIE } from "@/lib/session";
import { DeleteButton } from "./DeleteButton";

export const metadata = { title: "Data deletion · statswe" };

export default function DataDeletion() {
  return (
    <LegalPage title="Data deletion">
      <Section title="Delete your data">
        <p>
          Log in with Facebook, then press the button below. statswe removes everything stored for your login: your account
          profiles, posts, stories, insights, audience data, settings and competitor lists. You are then logged out.
        </p>
        <Suspense fallback={null}>
          <DeletionAction />
        </Suspense>
      </Section>

      <Section title="Or ask by email">
        <p>
          Email <a className="underline" href="mailto:sikavinraj@gmail.com">sikavinraj@gmail.com</a> from the address you use
          with Facebook. Include the Instagram username. We delete the data and confirm by reply.
        </p>
      </Section>

      <Section title="Removing access on Facebook">
        <p>
          You can also remove statswe from your Facebook Business Integrations settings. This stops further access but does not
          delete data already stored, so do one of the steps above as well.
        </p>
      </Section>
    </LegalPage>
  );
}

async function DeletionAction() {
  const session = await readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) {
    return (
      <p className="text-sm text-muted-foreground">
        You are not logged in.{" "}
        <Link href="/" className="underline">Log in with Facebook</Link> to delete your data here.
      </p>
    );
  }
  return <DeleteButton />;
}
