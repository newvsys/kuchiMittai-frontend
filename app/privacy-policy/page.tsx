const PrivacyPolicyPage = () => {
  return (
    <main className="max-w-screen-lg mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-blue-600 mb-10">Privacy Policy</h1>

      <div className="space-y-10 text-gray-700 text-base leading-8">

        <p>
          At Kuchi Mittai, we value your privacy and are committed to protecting your personal
          information. This Privacy Policy explains how we collect, use, store, and safeguard the
          information you provide while using our website and services.
        </p>
        <p>
          By accessing or using the Kuchi Mittai website, you agree to the terms outlined in this
          Privacy Policy.
        </p>

        <section>
          <h2 className="text-xl font-bold text-blue-600 mb-3">Information We Collect</h2>
          <p>When you use our website, we may collect the following information:</p>
          <ul className="list-disc list-outside pl-6 mt-4 space-y-2">
            <li>Full name</li>
            <li>Email address</li>
            <li>Mobile number</li>
            <li>Delivery and billing address</li>
            <li>Postal/ZIP code</li>
            <li>Payment-related details (processed securely through payment providers)</li>
            <li>Order history and purchase preferences</li>
            <li>Device information, IP address, browser type, and browsing activity</li>
            <li>Cookies and website usage data</li>
          </ul>
          <p className="mt-4">
            This information helps us provide a better shopping experience and improve our services.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-blue-600 mb-3">How We Collect Information</h2>
          <p>We collect information through:</p>
          <ul className="list-disc list-outside pl-6 mt-4 space-y-2">
            <li>Account registration</li>
            <li>Order placement</li>
            <li>Contact forms and customer support requests</li>
            <li>Newsletter subscriptions</li>
            <li>Website analytics and cookies</li>
            <li>Promotional campaigns or surveys</li>
          </ul>
          <p className="mt-4">
            We may also use cookies and similar technologies to understand user behavior, enhance
            website performance, and personalize content.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-blue-600 mb-3">How We Use Your Information</h2>
          <p>Kuchi Mittai may use your information to:</p>
          <ul className="list-disc list-outside pl-6 mt-4 space-y-2">
            <li>Process and deliver your orders</li>
            <li>Communicate order updates and customer support</li>
            <li>Improve our products, website, and services</li>
            <li>Personalize your shopping experience</li>
            <li>Send promotional offers, newsletters, or updates</li>
            <li>Prevent fraudulent or unauthorized activities</li>
            <li>Maintain transaction records as required by law</li>
          </ul>
          <p className="mt-4">
            We only use your information for legitimate business purposes and customer service
            improvements.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-blue-600 mb-3">Sharing of Information</h2>
          <p>Kuchi Mittai does not sell, rent, or trade your personal information to third parties.</p>
          <p className="mt-4">Your information may be shared only with:</p>
          <ul className="list-disc list-outside pl-6 mt-4 space-y-2">
            <li>Delivery and logistics partners</li>
            <li>Payment gateway providers</li>
            <li>Technology and service partners assisting website operations</li>
            <li>Legal authorities if required by applicable law</li>
          </ul>
          <p className="mt-4">
            All third-party partners are expected to maintain confidentiality and use your information
            only for authorized purposes.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-blue-600 mb-3">Cookies &amp; Analytics</h2>
          <p>Our website may use cookies, analytics tools, and third-party technologies to:</p>
          <ul className="list-disc list-outside pl-6 mt-4 space-y-2">
            <li>Improve website functionality</li>
            <li>Understand customer preferences</li>
            <li>Analyze traffic and user interactions</li>
            <li>Provide relevant advertisements and promotions</li>
          </ul>
          <p className="mt-4">
            You may choose to disable cookies through your browser settings; however, some website
            features may not function properly.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-blue-600 mb-3">Data Security</h2>
          <p>
            We take appropriate technical and organizational measures to protect your personal
            information from unauthorized access, misuse, loss, or disclosure.
          </p>
          <p className="mt-4">
            While we strive to maintain secure systems, no online transmission or storage method can
            be guaranteed to be 100% secure.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-blue-600 mb-3">Your Rights &amp; Choices</h2>
          <p>You may:</p>
          <ul className="list-disc list-outside pl-6 mt-4 space-y-2">
            <li>Access or update your personal information</li>
            <li>Request correction of inaccurate details</li>
            <li>Opt out of promotional emails or messages</li>
            <li>Request account deletion, subject to legal obligations</li>
          </ul>
          <p className="mt-4">
            For assistance regarding your personal information, you may contact our support team
            through the contact details provided on our website.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-blue-600 mb-3">Third-Party Links</h2>
          <p>
            Our website may contain links to third-party websites. Kuchi Mittai is not responsible for
            the privacy practices, policies, or content of external websites.
          </p>
          <p className="mt-4">
            Users are advised to review the privacy policies of third-party sites separately.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-blue-600 mb-3">Policy Updates</h2>
          <p>
            Kuchi Mittai reserves the right to update or modify this Privacy Policy at any time. Any
            changes will become effective immediately upon posting on this page.
          </p>
          <p className="mt-4">
            We encourage users to review this policy periodically to stay informed.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-blue-600 mb-3">Contact Us</h2>
          <p>
            If you have any questions or concerns regarding this Privacy Policy or how your information
            is handled, please contact Kuchi Mittai customer support at{" "}
            <a
              href="mailto:customercare@kuchimittai.com"
              className="text-blue-600 hover:underline"
            >
              customercare@kuchimittai.com
            </a>{" "}
            or call us on{" "}
              <a href="tel:+919943355568" className="text-blue-600 hover:underline">
                +91 9943355568
            </a>
            .
          </p>
        </section>

      </div>
    </main>
  );
};

export default PrivacyPolicyPage;
