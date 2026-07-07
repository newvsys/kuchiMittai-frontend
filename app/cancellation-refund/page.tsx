const CancellationRefundPage = () => {
  return (
    <main className="max-w-screen-lg mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-blue-600 mb-8">Cancellation And Refund</h1>

      <ol className="space-y-6 text-gray-700 text-base leading-8 list-decimal list-outside pl-5">
        <li>
          At Kuchi Mittai, we strive to deliver fresh and high-quality products with every order.
        </li>
        <li>
          Once an order is placed, it is processed immediately to ensure timely dispatch, and hence,
          order cannot be <strong>CANCELED</strong>.
        </li>
        <li>
          Kuchi Mittai will not be liable for any delays in delivery after the order has been shipped
          from our facility.
        </li>
        <li>
          In any case of cancellations due to unforeseen circumstances, the payment amount will be
          refunded.
        </li>
        <li>
          If Kuchi Mittai suspects any fraudulent transaction or transactions violating the terms of
          website use, Kuchi Mittai is at sole discretion to cancel such orders. Further such
          accounts / customers will be denied access to the use or purchase of products from the website.
        </li>
        <li>
          Please reach out to our customer care for any further information or queries at{" "}
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
        </li>
      </ol>
    </main>
  );
};

export default CancellationRefundPage;
