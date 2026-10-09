import { LegalPage, Section } from "@/components/legal-page";

export const metadata = { title: "Privacy policy · statswe" };

export default function PrivacyPolicy() {
  return (
    <LegalPage title="Privacy policy">
      <p>
        statswe is an Instagram insights dashboard. This policy explains what data it handles, why, and how you can delete it.
        Questions go to <a className="underline" href="mailto:sikavinraj@gmail.com">sikavinraj@gmail.com</a>.
      </p>

      <Section title="Who can use it">
        <p>
          You log in with Facebook. The app then shows the Instagram Business or Creator accounts linked to Facebook Pages you
          manage. Only the owner of an account can see that account&rsquo;s data in statswe.
        </p>
      </Section>

      <Section title="Data we collect">
        <ul className="list-disc space-y-1 pl-5">
          <li>Your Facebook user ID and name, and the Pages you manage (IDs and names).</li>
          <li>The linked Instagram accounts: username, name, profile picture, follower, following and post counts.</li>
          <li>Your posts, reels, tagged posts and stories, with captions, dates and insight metrics (views, reach, likes, comments, saves, shares, interactions).</li>
          <li>Daily account metrics for the last 90 days (reach, views, profile visits, follower change) and period totals.</li>
          <li>Audience demographics (age, country, city) in aggregate, and the hours your followers are online.</li>
          <li>Public profile statistics of Instagram accounts you search for or save as competitors.</li>
          <li>Settings you choose, such as a brand colour.</li>
        </ul>
      </Section>

      <Section title="Why we need the permissions">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>instagram_basic</strong>: read the Instagram account and its posts.</li>
          <li><strong>instagram_manage_insights</strong>: read insight metrics for accounts and posts.</li>
          <li><strong>pages_show_list</strong>: find the Pages you manage and the Instagram accounts linked to them.</li>
          <li><strong>pages_read_engagement</strong>: read Page-linked Instagram data that the insights need.</li>
          <li><strong>business_management</strong>: access the Business Manager assets that link Pages and Instagram accounts.</li>
        </ul>
        <p>We only use these permissions to show you your own data in the dashboard. We do not post, message or change anything on your accounts.</p>
      </Section>

      <Section title="How we store and protect data">
        <p>
          Data is stored in a Postgres database hosted by Neon. The app runs on Vercel. Access tokens are encrypted before they
          are stored (AES-256-GCM), and the login session is kept in a signed, HTTP-only cookie.
        </p>
        <p>
          To place cities on the maps, the city names are sent to the Open-Meteo geocoding service. No personal data is sent with
          them.
        </p>
      </Section>

      <Section title="Retention">
        <p>
          Your data is kept while your login exists. Daily competitor statistics are kept for up to 400 days. You can delete all
          of your data at any time (see the data deletion page). Once deleted it is removed from our database.
        </p>
      </Section>

      <Section title="What we do not do">
        <p>We do not sell your data, use it for advertising, or share it with third parties beyond the service providers named above.</p>
      </Section>

      <Section title="Your choices">
        <p>
          You can log out, delete your data from the data deletion page, or remove statswe under Facebook&rsquo;s Business
          Integrations settings. To ask for access or correction, email the address above.
        </p>
      </Section>

      <Section title="Meta">
        <p>
          statswe uses the Meta Platform. Use of Meta data is also subject to the{" "}
          <a className="underline" href="https://developers.facebook.com/terms/">Meta Platform Terms</a>.
        </p>
      </Section>
    </LegalPage>
  );
}
