import { LegalPage, Section } from "@/components/legal-page";

export const metadata = { title: "Terms of service · statswe" };

export default function Terms() {
  return (
    <LegalPage title="Terms of service">
      <Section title="The service">
        <p>
          statswe shows insights for Instagram Business and Creator accounts that you manage through Facebook Pages. It is provided
          as is, without warranty that every figure is complete or current. Figures come from Meta and are stored for display.
        </p>
      </Section>

      <Section title="Your account">
        <p>
          You log in with Facebook and must only use statswe for accounts you are allowed to access. You are responsible for
          keeping your Facebook login secure.
        </p>
      </Section>

      <Section title="Acceptable use">
        <p>
          Do not attempt to access other people&rsquo;s data, interfere with the service, or use it to break Meta&rsquo;s rules.
          The Meta Platform Terms and Instagram Terms of Use also apply.
        </p>
      </Section>

      <Section title="Stopping and deleting">
        <p>
          You can stop using statswe at any time and delete your data from the data deletion page. We may suspend access that
          breaks these terms.
        </p>
      </Section>

      <Section title="Liability">
        <p>
          To the extent the law allows, statswe is not liable for decisions made from its figures, or for losses from downtime or
          changes to Meta&rsquo;s APIs.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about these terms: <a className="underline" href="mailto:sikavinraj@gmail.com">sikavinraj@gmail.com</a>.
        </p>
      </Section>
    </LegalPage>
  );
}
