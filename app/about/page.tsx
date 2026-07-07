const AboutPage = () => {
  return (
    <main className="max-w-screen-lg mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-blue-600 mb-6">About Us</h1>

      <section className="space-y-6 text-gray-700 text-base leading-8">
        <p>
          At <strong>Kuchi Mittai</strong>, we bring the authentic taste of tradition right to your doorstep.
          We specialize in delivering a wide range of premium delicacies, including traditional sweets,
          crispy snacks, quality cooking oils, and many more.
        </p>
        <p>
          Our journey began with a simple mission — to preserve the rich culinary heritage of Tamil Nadu
          and make it accessible to everyone, no matter where they are. Every product we offer is crafted
          with care, using time-honoured recipes and the finest ingredients.
        </p>
        <p>
          We take pride in our commitment to quality, hygiene, and authenticity. From the moment an order
          is placed to the time it reaches your hands, we ensure the highest standards are maintained so
          you can enjoy every bite with confidence.
        </p>
        <p>
          Whether it is a festive celebration, a family gathering, or simply a craving for something
          delicious, Kuchi Mittai is here to make every moment sweeter.
        </p>

        <div className="mt-8 border-t pt-6">
          <h2 className="text-xl font-bold text-blue-600 mb-3">Our Values</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>Authentic recipes passed down through generations</li>
            <li>Premium quality ingredients sourced responsibly</li>
            <li>Strict hygiene and food safety standards</li>
            <li>Customer satisfaction at the heart of everything we do</li>
          </ul>
        </div>

        <div className="mt-8 border-t pt-6">
          <h2 className="text-xl font-bold text-blue-600 mb-3">Contact Us</h2>
          <p>Email: <a href="mailto:customercare@kuchimittai.com" className="text-blue-600 hover:underline">customercare@kuchimittai.com</a></p>
            <p>Call: +91 9943355568</p>
          <p>Customer Care Timings: 10:00 AM To 6:00 PM</p>
        </div>
      </section>
    </main>
  );
};

export default AboutPage;
