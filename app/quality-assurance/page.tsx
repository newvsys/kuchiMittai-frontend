const QualityAssurancePage = () => {
  const steps = [
    "We begin by sourcing premium-quality raw materials from trusted farmers and suppliers. Every ingredient is carefully selected to ensure freshness, purity, and consistent taste while supporting ethical and responsible sourcing practices.",
    "Our ingredients are prepared and crafted using traditional recipes combined with modern production methods. Each batch is made with precision to preserve authentic flavors and maintain the homemade taste our customers love.",
    "At every stage of production, strict hygiene and quality checks are followed by trained professionals. Our advanced manufacturing processes and food safety standards help us maintain consistency, freshness, and superior product quality.",
    "Before packaging, every product undergoes detailed quality inspections to ensure it meets our standards for taste, texture, freshness, and safety. Only products that pass our quality benchmarks move forward for distribution.",
    "Once approved, the products are securely packed to retain freshness and flavor, then delivered through our reliable distribution network to stores and customers across the region.",
  ];

  return (
    <main className="max-w-screen-lg mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-blue-600 mb-2">Kuchi Mittai Quality Policy</h1>
      <h2 className="text-xl font-semibold text-gray-600 mb-8">Our Promise</h2>

      <div className="space-y-10 text-gray-700 text-base leading-8">

        <p>
          At Kuchi Mittai, quality is more than a standard — it is our commitment to every customer.
          From carefully selected ingredients to the final pack that reaches your hands, we ensure every
          product reflects freshness, authenticity, hygiene, and great taste. We believe that only the
          best ingredients and processes can create snacks that bring true joy in every bite.
        </p>

        <section>
          <h2 className="text-xl font-bold text-blue-600 mb-6">
            Curious about how your favorite Kuchi Mittai treats are made?
          </h2>
          <ol className="space-y-6 list-none pl-0">
            {steps.map((step, index) => (
              <li key={index} className="flex gap-4">
                <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm">
                  {index + 1}
                </span>
                <p className="mt-1">{step}</p>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="text-xl font-bold text-blue-600 mb-3">Continuous Improvement</h2>
          <p>
            Kuchi Mittai is committed to continuous innovation and improvement. Through ongoing research
            and product development, we constantly refine our recipes, enhance nutritional value, and
            improve product quality while preserving the traditional taste that defines our brand.
          </p>
        </section>

        <section className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-r-lg">
          <h2 className="text-xl font-bold text-blue-600 mb-3">Our Commitment to You</h2>
          <p>
            Every Kuchi Mittai product is created with care, responsibility, and passion — ensuring that
            every bite delivers the quality and trust our customers deserve.
          </p>
        </section>

      </div>
    </main>
  );
};

export default QualityAssurancePage;
