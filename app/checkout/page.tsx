"use client";
import { useProductStore } from "../_zustand/store";
import Image from "next/image";
import { useEffect, useState, useRef, useMemo } from "react";
import React from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api";

const CheckoutPage = () => {

  // Pre-fetch company logo on mount so it's ready when payment dialog opens
  const logoBase64Ref = useRef<string>("");
  // Prevent re-fetching customer details if session token refreshes mid-session
  const customerFetchedRef = useRef(false);
  // Cache pincode serviceability results so switching between same-pincode addresses skips the API
  const pincodeServiceabilityCache = useRef<Map<string, boolean>>(new Map());
  // AbortController for cancelling an in-flight serviceability request when a new pincode is entered
  const pincodeAbortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    fetch("/companyLogo/CompanyLogo.png")
      .then(r => r.blob())
      .then(blob => new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      }))
      .then(b64 => { logoBase64Ref.current = b64; })
      .catch(() => {});
  }, []);

    // Razorpay payment handler
    const handleRazorpayPayment = async (orderResponse: any, userEmail: string, userPhone?: string) => {
      // Load Razorpay SDK on-demand — only when user actually pays
      if (!window.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://checkout.razorpay.com/v1/checkout.js';
          s.onload = () => resolve();
          s.onerror = () => reject(new Error('Razorpay SDK failed to load'));
          document.body.appendChild(s);
        }).catch(() => {
          toast.error('Payment gateway unavailable. Please try again.');
          return Promise.reject();
        });
      }
      if (!window.Razorpay) {
        toast.error('Razorpay SDK not loaded');
        return;
      }

      // Use pre-fetched logo (loaded on mount to avoid delay at payment time)
      const logoBase64 = logoBase64Ref.current || undefined;

      const options = {
        key: orderResponse.paymentGatewayKey, // From backend
        amount: Number(orderResponse.amount) * 100, // Amount in paise
        currency: orderResponse.currency || "INR",
        name: orderResponse.storeName || "Your Store Name",
        image: logoBase64,
        description: orderResponse.description || `Order #${orderResponse.orderNumber}`,
        order_id: orderResponse.paymentOrderId, // Razorpay order_id from backend
        handler: async function (response: any) {
          // Handle payment success
          setIsPaymentFinalizing(true);
          setIsSubmitting(true);
          // Call backend to verify payment
          try {
            const verifyRes = await apiClient.post("/api/payments/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            if (verifyRes.ok) {
              const verifyData = await verifyRes.json();
              if (verifyData.status === "success") {
                // No modal logic here
                setPaymentSuccess(true);
                clearCart();
                setCheckoutForm({
                  name: "",
                  phone: "",
                  email: "",
                  address1: "",
                  address2: "",
                  landmark: "",
                  city: "",
                  state: "",
                  country: "",
                  postalCode: "",
                });
                // Redirect to order status page with order id
                if (orderResponse && orderResponse.orderNumber) {
                  router.push(`/order-status/${orderResponse.orderNumber}`);
                } else {
                  router.push("/"); // fallback
                }
              } else {
                setIsPaymentFinalizing(false);
                setIsSubmitting(false);
                toast.error("Payment verification failed");
              }
            } else {
              setIsPaymentFinalizing(false);
              setIsSubmitting(false);
              toast.error("Payment verification failed (server error)");
            }
          } catch (err) {
            setIsPaymentFinalizing(false);
            setIsSubmitting(false);
            toast.error("Payment verification error");
          }
        },
        prefill: {
          email: userEmail,
          contact: userPhone || "",
        },
        theme: {
          color: "#3399cc"
        }
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    };
  const { data: session, status } = useSession();
  const [checkoutForm, setCheckoutForm] = useState({
    name: "",
    phone: "",
    email: "",
    address1: "",
    address2: "",
    landmark: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaymentFinalizing, setIsPaymentFinalizing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [isAddressReadOnly, setIsAddressReadOnly] = useState(false);
  const [customerLoading, setCustomerLoading] = useState(true);
  const [customer, setCustomer] = useState<any | null>(null);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [isAddingAddress, setIsAddingAddress] = useState(false);

  const handleCancelAddressPopup = () => {
    if (isAddingAddress) {
      // Remove the blank address that was optimistically added
      setCustomer((prev: any) => {
        if (!prev || !Array.isArray(prev.addresses)) return prev;
        const updated = prev.addresses.slice(0, -1);
        return { ...prev, addresses: updated };
      });
      setSelectedAddressIndex((prev: number) => Math.max(0, prev - 1));
    }
    setIsAddingAddress(false);
    setShowDetails(false);
    setIsAddressReadOnly(true);
  };
  const [addressPopupErrors, setAddressPopupErrors] = useState<{
    name?: boolean;
    phone?: boolean;
    address1?: boolean;
    city?: boolean;
    state?: boolean;
    postalCode?: boolean;
  }>({});
  const { products, total, clearCart } = useProductStore();
  const router = useRouter();
  const [deliveryCharge, setDeliveryCharge] = useState<number>(0);
  const [freeDelivery, setFreeDelivery] = useState<boolean>(true);
  const [pincodeServiceable, setPincodeServiceable] = useState<boolean | null>(null);
  const [pincodeChecking, setPincodeChecking] = useState(false);

  useEffect(() => {
    if (total <= 0) { setDeliveryCharge(0); setFreeDelivery(true); return; }
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || ""}/api/delivery-charges/calculate?orderAmount=${total}`)
      .then(r => r.json())
      .then(data => {
        if (data?.responseStatus === "SUCCESS") {
          setDeliveryCharge(data.applicableDeliveryCharge ?? 0);
          setFreeDelivery(data.isFreeDelivery ?? false);
        }
      })
      .catch(() => {});
  }, [total]);

  const checkPincodeServiceability = async (pincode: string) => {
    const digits = pincode.replace(/[^0-9]/g, "");
    if (!/^\d{6}$/.test(digits)) {
      setPincodeServiceable(null);
      setPincodeChecking(false);
      return;
    }
    // Return cached result immediately — no API call needed
    if (pincodeServiceabilityCache.current.has(digits)) {
      setPincodeServiceable(pincodeServiceabilityCache.current.get(digits)!);
      setPincodeChecking(false);
      return;
    }
    // Cancel any previous in-flight request before starting a new one
    pincodeAbortRef.current?.abort();
    pincodeAbortRef.current = new AbortController();
    setPincodeChecking(true);
    setPincodeServiceable(null);
    try {
      const variantIds = products.map(p => Number(p.id)).filter(id => !isNaN(id) && id > 0);
      const svcRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || ""}/api/shipping/serviceability/by-variants`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deliveryPostcode: digits, productVariantIds: variantIds }),
          signal: pincodeAbortRef.current.signal,
        }
      );
      if (svcRes.ok) {
        const svcData = await svcRes.json();
        const result = svcData?.serviceable === true;
        pincodeServiceabilityCache.current.set(digits, result);
        setPincodeServiceable(result);
      } else {
        // API error — treat as unknown, don't block checkout
        setPincodeServiceable(null);
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        // Network/service error — treat as unknown, don't block checkout
        setPincodeServiceable(null);
      }
    } finally {
      setPincodeChecking(false);
    }
  };

  const populateCityAndStateFromPincode = async (pincode: string) => {
    const digits = pincode.replace(/[^0-9]/g, "");

    if (digits.length !== 6) {
      setCheckoutForm((prev) => ({
        ...prev,
        city: "",
        state: "",
      }));
      return;
    }

    try {
      const res = await fetch(`/api/pincode/${digits}`);
      if (!res.ok) {
        throw new Error("Failed to fetch pincode details");
      }

      const data = await res.json();
      const first =
        Array.isArray(data) && data[0] &&
        Array.isArray(data[0].PostOffice) && data[0].PostOffice[0]
          ? data[0].PostOffice[0]
          : null;

      const cityName = first?.District || first?.Name || "";
      const stateName = first?.State || "";

      setCheckoutForm((prev) => ({
        ...prev,
        city: cityName,
        state: stateName,
      }));
      setAddressPopupErrors((prev) => ({
        ...prev,
        city: false,
        state: false,
      }));

      if (customer && Array.isArray(customer.addresses) && customer.addresses[selectedAddressIndex]) {
        setCustomer((prev: any) => {
          if (!prev || !Array.isArray(prev.addresses) || !prev.addresses[selectedAddressIndex]) return prev;
          const updated = { ...prev };
          updated.addresses = [...updated.addresses];
          updated.addresses[selectedAddressIndex] = {
            ...updated.addresses[selectedAddressIndex],
            city: cityName,
            state: stateName,
          };
          return updated;
        });
      }
    } catch (err) {
      console.error("Failed to fetch city/state for pincode", err);
      setCheckoutForm((prev) => ({
        ...prev,
        city: "",
        state: "",
      }));
    }
  };

  // Fetch existing customer address and prefill form; make address fields read-only if present
  useEffect(() => {
    const fetchCustomerDetails = async () => {
      if (status === "loading") return; // Wait for auth to resolve
      if (customerFetchedRef.current) return; // Already fetched — ignore session token refreshes
      const userId = (session as any)?.user?.id;
      if (!userId) {
        setCustomerLoading(false); // Not logged in — no fetch needed
        return;
      }

      customerFetchedRef.current = true; // Lock before the async call to prevent race conditions
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";
        const res = await fetch(`${API_BASE_URL}/user/get-customer-details?userId=${userId}`);
        if (!res.ok) {
          console.error("Failed to fetch customer details");
          return;
        }

        const data: any = await res.json();
        setCustomer(data);

        setCheckoutForm((prev) => ({
          ...prev,
          name: data.firstName || prev.name,
          phone: data.mobileNumber || prev.phone,
          email: data.email || prev.email,
        }));

        if (data && Array.isArray(data.addresses) && data.addresses.length > 0) {
          const addr = data.addresses[0];
          setSelectedAddressIndex(0);
          setCheckoutForm((prev) => ({
            ...prev,
            name: data.firstName || addr.recipientName || prev.name,
            phone: addr.contactNumber || data.mobileNumber || prev.phone,
            email: data.email || prev.email,
            address1: addr.addressLine1 || prev.address1,
            address2: addr.addressLine2 || prev.address2,
            landmark: addr.landMark || prev.landmark,
            city: addr.city || prev.city,
            state: addr.state || prev.state,
            country: addr.country || prev.country,
            postalCode: addr.postalCode || prev.postalCode,
          }));
          setIsAddressReadOnly(true);
          checkPincodeServiceability(addr.postalCode || "");
        }
      } catch (error) {
        console.error("Error fetching customer details", error);
      } finally {
        setCustomerLoading(false);
      }
    };

    fetchCustomerDetails();
  }, [session, status]);

  const handleSelectAddress = (index: number) => {
    if (!customer || !Array.isArray(customer.addresses) || !customer.addresses[index]) return;
    const addr = customer.addresses[index];
    setSelectedAddressIndex(index);
    setCheckoutForm((prev) => ({
      ...prev,
      name: customer.firstName || addr.recipientName || prev.name,
      phone: addr.contactNumber || customer.mobileNumber || prev.phone,
      email: customer.email || prev.email,
      address1: addr.addressLine1 || prev.address1,
      address2: addr.addressLine2 || prev.address2,
      landmark: addr.landMark || prev.landmark,
      city: addr.city || prev.city,
      state: addr.state || prev.state,
      country: addr.country || prev.country,
      postalCode: addr.postalCode || prev.postalCode,
    }));
    setIsAddressReadOnly(true);
    checkPincodeServiceability(addr.postalCode || "");
  };

  const handleAddNewAddress = () => {
    if (!customer) return;

    const currentLength = Array.isArray(customer.addresses)
      ? customer.addresses.length
      : 0;

    const newAddress = {
      addressId: null,
      addressType: "",
      recipientName: customer.firstName || checkoutForm.name || "",
      addressLine1: "",
      addressLine2: "",
      landMark: "",
      city: "",
      state: "",
      country: "",
      postalCode: "",
      contactNumber: customer.mobileNumber || checkoutForm.phone || "",
    };

    setCustomer((prev: any) => {
      if (!prev) return prev;
      const existing = Array.isArray(prev.addresses) ? prev.addresses : [];
      return {
        ...prev,
        addresses: [...existing, newAddress],
      };
    });

    setSelectedAddressIndex(currentLength);
    setCheckoutForm((prev) => ({
      ...prev,
      name: customer.firstName || prev.name,
      phone: customer.mobileNumber || prev.phone,
      email: customer.email || prev.email,
      address1: "",
      address2: "",
      landmark: "",
      city: "",
      state: "",
      country: "",
      postalCode: "",
    }));

    setIsAddressReadOnly(false);
    setPincodeServiceable(null);
    setIsAddingAddress(true);
    setShowDetails(true);
  };

  const handleSaveAddressChanges = async (): Promise<boolean> => {
    if (!customer) return false;

    // Validate mandatory fields for the popup before saving
    const errors: {
      name?: boolean;
      phone?: boolean;
      address1?: boolean;
      city?: boolean;
      state?: boolean;
      postalCode?: boolean;
    } = {};

    if (!checkoutForm.name.trim() || checkoutForm.name.trim().length < 2) {
      errors.name = true;
    }

    const phoneDigits = checkoutForm.phone.replace(/[^0-9]/g, "");
    if (!checkoutForm.phone.trim() || !/^[6-9]\d{9}$/.test(phoneDigits)) {
      errors.phone = true;
    }

    if (!checkoutForm.address1.trim() || checkoutForm.address1.trim().length < 5) {
      errors.address1 = true;
    }

    if (!checkoutForm.city.trim() || checkoutForm.city.trim().length < 2) {
      errors.city = true;
    }

    if (!checkoutForm.state.trim() || checkoutForm.state.trim().length < 2) {
      errors.state = true;
    }

    const postalDigits = checkoutForm.postalCode.replace(/[^0-9]/g, "");
    if (!postalDigits || !/^\d{6}$/.test(postalDigits)) {
      errors.postalCode = true;
    }

    if (Object.values(errors).some(Boolean)) {
      setAddressPopupErrors(errors);
      return false;
    }

    setAddressPopupErrors({});

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";
      const { userId, ...payload } = customer as any;
      const res = await fetch(`${API_BASE_URL}/user/update-customer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        toast.error("Failed to update address");
        return false;
      }
      toast.success("Address updated successfully");
      setIsAddressReadOnly(true);
      return true;
    } catch (error) {
      console.error("Error updating customer address", error);
      toast.error("Error updating address");
      return false;
    }
  };

  // Add validation functions that match server requirements
  const validateForm = () => {
    const errors: string[] = [];
    
    // Name validation
    if (!checkoutForm.name.trim() || checkoutForm.name.trim().length < 2) {
      errors.push("Name must be at least 2 characters");
    }
    
    
    // Email validation
    if (checkoutForm.email.trim()) {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if ( !emailRegex.test(checkoutForm.email.trim())) {
      errors.push("Please enter a valid email address");
    }
  }
    
    // Phone validation (Indian mobile: 10 digits starting from 6-9)
    const phoneDigits = checkoutForm.phone.replace(/[^0-9]/g, '');
    if (!checkoutForm.phone.trim() || !/^[6-9]\d{9}$/.test(phoneDigits)) {
      errors.push("Please enter a valid 10-digit mobile number starting with 6-9");
    }
    
    // Address1 mandatory
    if (!checkoutForm.address1.trim()) {
      errors.push("Address1 is required");
    }
   
    
    // City & State mandatory
    if (!checkoutForm.city.trim()) {
      errors.push("City is required");
    }
    if (!checkoutForm.state.trim()) {
      errors.push("State is required");
    }

    // Postal code: mandatory 6-digit
    const postalDigits = checkoutForm.postalCode.replace(/[^0-9]/g, '');
    if (!postalDigits || !/^\d{6}$/.test(postalDigits)) {
      errors.push("Please enter a valid 6-digit postal code");
    }
    
    return errors;
  };

  const makePurchase = async () => {
    // Client-side validation — set inline field errors instead of toasts
    const phoneDigits = checkoutForm.phone.replace(/[^0-9]/g, '');
    const postalDigits = checkoutForm.postalCode.replace(/[^0-9]/g, '');

    const fieldErrors = {
      name: !checkoutForm.name.trim() || checkoutForm.name.trim().length < 2,
      phone: !checkoutForm.phone.trim() || !/^[6-9]\d{9}$/.test(phoneDigits),
      address1: !checkoutForm.address1.trim() || checkoutForm.address1.trim().length < 5,
      city: !checkoutForm.city.trim(),
      state: !checkoutForm.state.trim(),
      postalCode: !postalDigits || !/^\d{6}$/.test(postalDigits),
    };

    if (Object.values(fieldErrors).some(Boolean)) {
      setAddressPopupErrors(fieldErrors);
      return;
    }

    setAddressPopupErrors({});

    if (products.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    if (total <= 0) {
      toast.error("Invalid order total");
      return;
    }

    // Guard: pincode must be verified as serviceable before placing order
    if (pincodeServiceable === false) {
      toast.error("Delivery is not available to this pincode. Please use a different address.");
      return;
    }
    if (pincodeServiceable === null) {
      toast.error("Please enter a valid 6-digit postal code to check delivery availability.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Get user ID directly from authenticated session (used elsewhere in the app)
      const userId = (session as any)?.user?.id ?? null;
      
      // Prepare the order data with products
      const customerId = (customer as any)?.customerId ?? null;
      const orderAddressId =
        customer && Array.isArray(customer.addresses) && customer.addresses[selectedAddressIndex]
          ? (customer.addresses[selectedAddressIndex] as any).addressId ?? null
          : null;

      const orderData = {
        name: checkoutForm.name.trim(),
        phone: checkoutForm.phone.trim(),
        email: checkoutForm.email.trim().toLowerCase(),
        address1: checkoutForm.address1.trim(),
        address2: checkoutForm.address2.trim(),
        landmark: checkoutForm.landmark.trim(),
        postalCode: checkoutForm.postalCode.trim(),
        status: "P",
        total: total,
        city: checkoutForm.city.trim(),
        state: checkoutForm.state.trim(),
        country: checkoutForm.country.trim(),
        customerId,
        orderAddressId,
        userId: userId, // Add user ID for notifications
        products: products.map(p => ({
          productId: p.id,
          quantity: p.amount
        }))
      };

      // Send order data to server for validation and processing
      const response = await apiClient.post("/api/orders", orderData);

      // Check if response is ok before parsing
      if (!response.ok) {
        console.error("❌ Response not OK:", response.status, response.statusText);
        const errorText = await response.text();
        console.error("Error response body:", errorText);
        
        // Try to parse as JSON to get detailed error info
        try {
          const errorData = JSON.parse(errorText);
          console.error("Parsed error data:", errorData);
          
          // Handle different error types
          if (response.status === 409) {
            // Duplicate order error
            toast.error(errorData.details || errorData.error || "Duplicate order detected");
            return; // Don't throw, just return to stop execution
          } else if (errorData.details && Array.isArray(errorData.details)) {
            // Validation errors
            errorData.details.forEach((detail: any) => {
              toast.error(`${detail.field}: ${detail.message}`);
            });
          } else if (typeof errorData.details === 'string') {
            // Single error message in details
            toast.error(errorData.details);
          } else {
            // Fallback error message
            toast.error(errorData.error || "Order creation failed");
          }
        } catch (parseError) {
          console.error("Could not parse error as JSON:", parseError);
          toast.error("Order creation failed. Please try again.");
        }
        
        return; // Stop execution instead of throwing
      }

      const data = await response.json();

      const payload = data?.data ?? data;

      const paymentOrderId =
        payload?.paymentOrderId ||
        payload?.orderId ||
        payload?.razorpayOrderId ||
        payload?.razorpay_order_id ||
        payload?.payment?.paymentOrderId ||
        payload?.payment?.orderId ||
        payload?.paymentDetails?.paymentOrderId ||
        payload?.paymentDetails?.orderId;

      const paymentGatewayKey =
        payload?.paymentGatewayKey ||
        payload?.gatewayKey ||
        payload?.razorpayKey ||
        payload?.razorpay_key ||
        payload?.key ||
        payload?.payment?.paymentGatewayKey ||
        payload?.payment?.gatewayKey ||
        payload?.paymentDetails?.paymentGatewayKey ||
        payload?.paymentDetails?.gatewayKey;

      const normalizedPaymentData = {
        ...payload,
        paymentOrderId,
        paymentGatewayKey,
        amount: payload?.amount ?? payload?.total ?? total,
      };

      if (!normalizedPaymentData.paymentOrderId || !normalizedPaymentData.paymentGatewayKey) {
        console.error("Missing payment gateway details in response:", data);
        toast.error("Payment gateway details missing in response");
        return;
      }

      // Trigger Razorpay payment with backend response
      await handleRazorpayPayment(normalizedPaymentData, checkoutForm.email, checkoutForm.phone);
    } catch (error: any) {
      console.error("💥 Error in makePurchase:", error);
      
      // Handle server validation errors
      if (error.response?.status === 400) {
        try {
          const errorData = await error.response.json();
          if (errorData.details && Array.isArray(errorData.details)) {
            // Show specific validation errors
            errorData.details.forEach((detail: any) => {
              toast.error(`${detail.field}: ${detail.message}`);
            });
          } else {
            toast.error(errorData.error || "Validation failed");
          }
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError);
          toast.error("Validation failed");
        }
      } else if (error.response?.status === 409) {
        toast.error("Duplicate order detected. Please wait before creating another order.");
      } else {
        toast.error("Failed to create order. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // addOrderProduct merged into order creation

  useEffect(() => {
    // Wait for Zustand persist hydration before checking — avoids false-positive
    // redirect when products haven't loaded from localStorage yet
    const check = () => {
      if (useProductStore.getState().products.length === 0) {
        router.push("/cart");
      }
    };
    if (useProductStore.persist.hasHydrated()) {
      check();
    } else {
      const unsub = useProductStore.persist.onFinishHydration(check);
      return unsub;
    }
  }, []);

  const hasSavedAddresses = useMemo(
    () => !!(customer && Array.isArray(customer.addresses) && customer.addresses.length > 0),
    [customer]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Full-page overlay while redirecting after successful payment */}
      {(isPaymentFinalizing || paymentSuccess) && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm">
          <svg className="animate-spin h-10 w-10 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <p className="text-lg font-semibold text-gray-700">Payment successful! Finalizing your order and redirecting...</p>
        </div>
      )}

      <div className="w-full px-4 sm:px-6 lg:px-10 py-6">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm font-medium">
          <a href="/search?categoryId=0&price=10000&minPrice=0" className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V21a.75.75 0 01-.75.75H15.75a.75.75 0 01-.75-.75v-4.5h-6V21a.75.75 0 01-.75.75H3.75A.75.75 0 013 21V9.75z"/></svg>
            Home
          </a>
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
          <a href="/cart" className="text-blue-600 hover:text-blue-800 transition-colors">Cart</a>
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
          <span className="text-gray-800 font-semibold">Checkout</span>
          <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
          <span className="text-gray-400">Payment</span>
          <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
          <span className="text-gray-400">Confirmation</span>
        </nav>
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4 items-start">

          {/* Order Summary — right column on desktop, below form on mobile */}
          <div className="order-last lg:order-none">
          <div className="sticky top-6">
          <section aria-labelledby="summary-heading" className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 -mx-6 -mt-6 px-6 py-3.5 mb-5 rounded-t-2xl">
              <h2 id="summary-heading" className="text-sm font-bold text-white tracking-wide">Order Summary</h2>
            </div>

            <ul role="list" className="divide-y divide-gray-100">
              {products.map((product) => (
                <li key={product?.id} className="flex items-center gap-3 py-3">
                  <Image
                    src={product?.image ? `/${product?.image}` : "/product_placeholder.jpg"}
                    alt={product?.title}
                    width={56}
                    height={56}
                    className="h-14 w-14 flex-shrink-0 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">{product?.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Qty: {product?.amount}</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 flex-shrink-0">₹{product?.price}</p>
                </li>
              ))}
            </ul>

            <dl className="space-y-3 border-t border-gray-100 mt-4 pt-4 text-sm text-gray-700">
              {(() => {
                const mrpTotal = products.reduce((sum, p) => sum + ((p.mrp ?? p.price) * p.amount), 0);
                const discount = Math.max(0, Math.round(mrpTotal - total));
                const hasDiscount = discount > 0;
                return (
                  <>
                    {hasDiscount && (
                      <div className="flex items-center justify-between text-gray-400 line-through text-xs">
                        <dt>MRP Total</dt>
                        <dd>₹ {Math.round(mrpTotal)}</dd>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <dt className="text-gray-500">Subtotal</dt>
                      <dd className="font-medium text-gray-800">₹ {total}</dd>
                    </div>
                    {hasDiscount && (
                      <div className="flex items-center justify-between text-green-600 text-xs font-semibold">
                        <dt>Discount (MRP savings)</dt>
                        <dd>− ₹ {discount}</dd>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <dt className="text-gray-500">Delivery</dt>
                      <dd className="font-medium">{deliveryCharge === 0 ? <span className="text-green-600 font-semibold">Free</span> : `₹ ${deliveryCharge}`}</dd>
                    </div>
                    {freeDelivery && (
                      <div className="flex items-center text-green-600 text-xs font-medium">
                        <span>✓ Eligible for free delivery</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-1">
                      <dt className="text-base font-semibold text-gray-900">Total</dt>
                      <dd className="text-base font-bold text-gray-900">₹ {total === 0 ? 0 : Math.round(total + deliveryCharge)}</dd>
                    </div>
                  </>
                );
              })()}
              <div className="mt-6 flex justify-end">
              <button
                  type="button"
                  onClick={makePurchase}
                  disabled={isSubmitting || customerLoading || pincodeChecking || pincodeServiceable === false}
                  className="rounded-lg px-6 py-2.5 text-sm font-semibold text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Processing…
                    </span>
                  ) : pincodeChecking ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Checking…
                    </span>
                  ) : "Place Order"}
                </button>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-center gap-5 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="11" width="18" height="11" rx="2"/><path strokeLinecap="round" strokeLinejoin="round" d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    SSL Secured
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    Safe Checkout
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
                    Easy Payment
                  </span>
                </div>
            </dl>
          </section>
          </div>
          </div>

          {/* LEFT — Contact & Shipping form */}
          <form className="space-y-5 order-first">
            {/* Address skeleton — shown while customer details are loading for logged-in users */}
            {customerLoading && status !== "unauthenticated" && (
              <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <div className="bg-gray-100 border-b border-gray-200 -mx-6 -mt-6 px-6 py-3 mb-5 rounded-t-2xl">
                  <div className="h-4 w-36 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="space-y-2">
                  {[1, 2].map(i => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-gray-200">
                      <div className="h-4 w-4 rounded-full bg-gray-200 animate-pulse mt-0.5 flex-shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-3/4 bg-gray-200 rounded animate-pulse" />
                        <div className="h-3 w-1/2 bg-gray-200 rounded animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {hasSavedAddresses && (
              <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 max-w-sm">
                <div className="bg-gray-100 border-b border-gray-200 -mx-6 -mt-6 px-6 py-3 mb-5 rounded-t-2xl">
                  <h2 className="text-sm font-bold text-gray-800">Delivery Address</h2>
                </div>
                <div className="space-y-2">
                  {customer.addresses.map((addr: any, idx: number) => (
                    <label
                      key={addr.addressId ?? idx}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                        selectedAddressIndex === idx
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="saved-address"
                        className="mt-0.5 accent-blue-600"
                        checked={selectedAddressIndex === idx}
                        onChange={() => handleSelectAddress(idx)}
                      />
                      <span className="text-sm text-gray-700 leading-snug">
                        {addr.addressLine1}
                        {addr.addressLine2 ? `, ${addr.addressLine2}` : ""}
                        {", "}
                        {addr.city}, {addr.state} – {addr.postalCode}
                      </span>
                    </label>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDetails(true);
                      setIsAddingAddress(false);
                      setIsAddressReadOnly(false);
                    }}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    Edit selected address
                  </button>
                  <button
                    type="button"
                    onClick={handleAddNewAddress}
                    className="rounded-lg border border-blue-500 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    + Add new address
                  </button>
                </div>
                {pincodeChecking && (
                  <p className="mt-3 text-xs text-blue-500 flex items-center gap-1.5"><svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Checking delivery availability...</p>
                )}
                {!pincodeChecking && pincodeServiceable === false && (
                  <p className="mt-3 text-xs text-red-600 font-medium bg-red-50 rounded-lg px-3 py-2">
                    ✗ Delivery not available to this pincode. Please use a different address.
                  </p>
                )}
                {!pincodeChecking && pincodeServiceable === true && (
                  <p className="mt-3 text-xs text-green-600 font-medium bg-green-50 rounded-lg px-3 py-2">✓ Delivery available to this pincode</p>
                )}
              </section>
            )}

            {/* Contact & Shipping details (inline when no saved addresses, popup when editing saved) */}
            {(!hasSavedAddresses || showDetails) && (
              <div
                className={
                  hasSavedAddresses
                    ? "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                    : ""
                }
              >
              <div
                  className={
                    hasSavedAddresses
                      ? "bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
                      : "bg-white rounded-2xl border border-gray-200 shadow-sm"
                  }
                >
                  {hasSavedAddresses && (
                    <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-500 rounded-t-2xl flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                        <h2 className="text-base font-bold text-white">{isAddingAddress ? "Add Address" : "Edit Delivery Address"}</h2>
                      </div>
                      <button type="button" onClick={handleCancelAddressPopup} className="text-white/70 hover:text-white text-2xl leading-none">&times;</button>
                    </div>
                  )}
                  <div className={hasSavedAddresses ? "px-6 py-5" : "p-6"}>
                  {!hasSavedAddresses && (
                    <div className="bg-gradient-to-r from-blue-600 to-blue-500 border-b border-blue-500 -mx-6 -mt-6 px-6 py-3.5 mb-5 rounded-t-2xl">
                      <h2 className="text-sm font-bold text-white tracking-wide">Contact &amp; Shipping Details</h2>
                    </div>
                  )}
                  {/* Contact Information */}
                  <section aria-labelledby="contact-info-heading">
                    <h2
                      id="contact-info-heading"
                      className="text-base font-semibold text-gray-900 mb-4"
                    >
                      Contact information
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="relative">
                      <input
                        value={checkoutForm.name}
                        onChange={(e) => {
                          const value = e.target.value;
                          setCheckoutForm({ ...checkoutForm, name: value });
                          setAddressPopupErrors(prev => ({ ...prev, name: false }));
                        }}
                        type="text"
                        id="name-input"
                        name="name-input"
                        autoComplete="given-name"
                        disabled={isSubmitting}
                        placeholder=" "
                        className={`peer block w-full rounded-md border px-3 pt-5 pb-2 text-sm text-gray-900 focus:outline-none focus:ring-1 transition-colors ${addressPopupErrors.name ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "border-gray-300 focus:border-blue-600 focus:ring-blue-600"} ${isSubmitting ? "bg-gray-50 text-gray-400 cursor-not-allowed" : "bg-white"}`}
                      />
                      <label
                        htmlFor="name-input"
                        className={`pointer-events-none absolute left-2.5 -top-2.5 bg-white px-1 text-xs transition-all duration-200 peer-placeholder-shown:top-3.5 peer-placeholder-shown:left-3 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400 peer-placeholder-shown:bg-transparent peer-placeholder-shown:px-0 peer-focus:-top-2.5 peer-focus:left-2.5 peer-focus:text-xs peer-focus:bg-white peer-focus:px-1 ${addressPopupErrors.name ? "text-red-500 peer-focus:text-red-500" : "text-blue-600 peer-focus:text-blue-600"}`}
                      >
                        Name <span className="text-red-500 ml-0.5">*</span>
                      </label>
                      {addressPopupErrors.name && (
                        <p className="mt-1 text-xs text-red-500">Please enter a valid name (min 2 characters)</p>
                      )}
                    </div>

                    <div className="relative">
                      <input
                        value={checkoutForm.phone}
                        onChange={(e) => {
                          const value = e.target.value;
                          setCheckoutForm({ ...checkoutForm, phone: value });
                          setAddressPopupErrors(prev => ({ ...prev, phone: false }));
                        }}
                        type="tel"
                        id="phone-input"
                        name="phone-input"
                        autoComplete="tel"
                        disabled={isSubmitting}
                        placeholder=" "
                        className={`peer block w-full rounded-md border px-3 pt-5 pb-2 text-sm text-gray-900 focus:outline-none focus:ring-1 transition-colors ${addressPopupErrors.phone ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "border-gray-300 focus:border-blue-600 focus:ring-blue-600"} ${isSubmitting ? "bg-gray-50 text-gray-400 cursor-not-allowed" : "bg-white"}`}
                      />
                      <label
                        htmlFor="phone-input"
                        className={`pointer-events-none absolute left-2.5 -top-2.5 bg-white px-1 text-xs transition-all duration-200 peer-placeholder-shown:top-3.5 peer-placeholder-shown:left-3 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400 peer-placeholder-shown:bg-transparent peer-placeholder-shown:px-0 peer-focus:-top-2.5 peer-focus:left-2.5 peer-focus:text-xs peer-focus:bg-white peer-focus:px-1 ${addressPopupErrors.phone ? "text-red-500 peer-focus:text-red-500" : "text-blue-600 peer-focus:text-blue-600"}`}
                      >
                        Phone Number <span className="text-red-500 ml-0.5">*</span>
                      </label>
                      {addressPopupErrors.phone && (
                        <p className="mt-1 text-xs text-red-500">Please enter a valid 10-digit mobile number (starting with 6–9)</p>
                      )}
                    </div>
                    </div>

                    <div className="relative mt-4">
                      <input
                        value={checkoutForm.email}
                        onChange={(e) => setCheckoutForm({ ...checkoutForm, email: e.target.value })}
                        type="email"
                        id="email-address"
                        name="email-address"
                        autoComplete="email"
                        disabled={isSubmitting}
                        placeholder=" "
                        className={`peer block w-full rounded-md border px-3 pt-5 pb-2 text-sm text-gray-900 focus:outline-none focus:ring-1 transition-colors border-gray-300 focus:border-blue-600 focus:ring-blue-600 ${isSubmitting ? "bg-gray-50 text-gray-400 cursor-not-allowed" : "bg-white"}`}
                      />
                      <label
                        htmlFor="email-address"
                        className="pointer-events-none absolute left-2.5 -top-2.5 bg-white px-1 text-xs transition-all duration-200 peer-placeholder-shown:top-3.5 peer-placeholder-shown:left-3 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400 peer-placeholder-shown:bg-transparent peer-placeholder-shown:px-0 peer-focus:-top-2.5 peer-focus:left-2.5 peer-focus:text-xs peer-focus:bg-white peer-focus:px-1 text-blue-600 peer-focus:text-blue-600"
                      >
                        Email address
                      </label>
                    </div>
                  </section>

                  {/* Shipping Address */}
                  <section aria-labelledby="shipping-heading" className={hasSavedAddresses ? "mt-6" : "mt-0"}>
                    <hr className="border-gray-100 mb-5" />
                    <h2
                      id="shipping-heading"
                      className="text-base font-semibold text-gray-900 mb-4"
                    >
                      Shipping address
                    </h2>

                    <div className="grid grid-cols-1 gap-y-4">
                <div>
                  <div className="relative">
                    <input
                      type="text"
                      id="address1"
                      name="address1"
                      disabled={isSubmitting}
                      readOnly={isAddressReadOnly}
                      placeholder=" "
                      className={`peer block w-full rounded-md border px-3 pt-5 pb-2 text-sm text-gray-900 focus:outline-none focus:ring-1 transition-colors ${addressPopupErrors.address1 ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "border-gray-300 focus:border-blue-600 focus:ring-blue-600"} ${isSubmitting ? "bg-gray-50 text-gray-400 cursor-not-allowed" : "bg-white"}`}
                      value={checkoutForm.address1}
                      onChange={(e) => {
                        const value = e.target.value;
                        setCheckoutForm({ ...checkoutForm, address1: value });
                        setAddressPopupErrors(prev => ({ ...prev, address1: false }));
                        if (customer && Array.isArray(customer.addresses) && customer.addresses[selectedAddressIndex]) {
                          setCustomer((prev: any) => {
                            if (!prev || !Array.isArray(prev.addresses) || !prev.addresses[selectedAddressIndex]) return prev;
                            const updated = { ...prev };
                            updated.addresses = [...updated.addresses];
                            updated.addresses[selectedAddressIndex] = { ...updated.addresses[selectedAddressIndex], addressLine1: value };
                            return updated;
                          });
                        }
                      }}
                    />
                    <label
                      htmlFor="address1"
                      className={`pointer-events-none absolute left-2.5 -top-2.5 bg-white px-1 text-xs transition-all duration-200 peer-placeholder-shown:top-3.5 peer-placeholder-shown:left-3 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400 peer-placeholder-shown:bg-transparent peer-placeholder-shown:px-0 peer-focus:-top-2.5 peer-focus:left-2.5 peer-focus:text-xs peer-focus:bg-white peer-focus:px-1 ${addressPopupErrors.address1 ? "text-red-500 peer-focus:text-red-500" : "text-blue-600 peer-focus:text-blue-600"}`}
                    >
                      Address Line 1 <span className="text-red-500 ml-0.5">*</span>
                    </label>
                    {addressPopupErrors.address1 && (
                      <p className="mt-1 text-xs text-red-500">Address must be at least 5 characters</p>
                    )}
                  </div>
                </div>

                <div>
                  <div className="relative">
                    <input
                      type="text"
                      id="address2"
                      name="address2"
                      autoComplete="street-address"
                      disabled={isSubmitting}
                      readOnly={isAddressReadOnly}
                      placeholder=" "
                      className={`peer block w-full rounded-md border px-3 pt-5 pb-2 text-sm text-gray-900 focus:outline-none focus:ring-1 transition-colors border-gray-300 focus:border-blue-600 focus:ring-blue-600 ${isSubmitting ? "bg-gray-50 text-gray-400 cursor-not-allowed" : "bg-white"}`}
                      value={checkoutForm.address2}
                      onChange={(e) => {
                        const value = e.target.value;
                        setCheckoutForm({ ...checkoutForm, address2: value });
                        if (customer && Array.isArray(customer.addresses) && customer.addresses[selectedAddressIndex]) {
                          setCustomer((prev: any) => {
                            if (!prev || !Array.isArray(prev.addresses) || !prev.addresses[selectedAddressIndex]) return prev;
                            const updated = { ...prev };
                            updated.addresses = [...updated.addresses];
                            updated.addresses[selectedAddressIndex] = { ...updated.addresses[selectedAddressIndex], addressLine2: value };
                            return updated;
                          });
                        }
                      }}
                    />
                    <label
                      htmlFor="address2"
                      className="pointer-events-none absolute left-2.5 -top-2.5 bg-white px-1 text-xs transition-all duration-200 peer-placeholder-shown:top-3.5 peer-placeholder-shown:left-3 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400 peer-placeholder-shown:bg-transparent peer-placeholder-shown:px-0 peer-focus:-top-2.5 peer-focus:left-2.5 peer-focus:text-xs peer-focus:bg-white peer-focus:px-1 text-blue-600 peer-focus:text-blue-600"
                    >
                      Address Line 2
                    </label>
                  </div>
                </div>

                <div>
                  <div className="relative">
                    <input
                      type="text"
                      id="landmark"
                      name="landmark"
                      disabled={isSubmitting}
                      readOnly={isAddressReadOnly}
                      placeholder=" "
                      className={`peer block w-full rounded-md border px-3 pt-5 pb-2 text-sm text-gray-900 focus:outline-none focus:ring-1 transition-colors border-gray-300 focus:border-blue-600 focus:ring-blue-600 ${isSubmitting ? "bg-gray-50 text-gray-400 cursor-not-allowed" : "bg-white"}`}
                      value={checkoutForm.landmark}
                      onChange={(e) => {
                        const value = e.target.value;
                        setCheckoutForm({ ...checkoutForm, landmark: value });
                        if (customer && Array.isArray(customer.addresses) && customer.addresses[selectedAddressIndex]) {
                          setCustomer((prev: any) => {
                            if (!prev || !Array.isArray(prev.addresses) || !prev.addresses[selectedAddressIndex]) return prev;
                            const updated = { ...prev };
                            updated.addresses = [...updated.addresses];
                            updated.addresses[selectedAddressIndex] = { ...updated.addresses[selectedAddressIndex], landMark: value };
                            return updated;
                          });
                        }
                      }}
                    />
                    <label
                      htmlFor="landmark"
                      className="pointer-events-none absolute left-2.5 -top-2.5 bg-white px-1 text-xs transition-all duration-200 peer-placeholder-shown:top-3.5 peer-placeholder-shown:left-3 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400 peer-placeholder-shown:bg-transparent peer-placeholder-shown:px-0 peer-focus:-top-2.5 peer-focus:left-2.5 peer-focus:text-xs peer-focus:bg-white peer-focus:px-1 text-blue-600 peer-focus:text-blue-600"
                    >
                      Landmark
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="relative">
                    <input
                      type="text"
                      id="postal-code"
                      name="postal-code"
                      autoComplete="postal-code"
                      disabled={isSubmitting || pincodeChecking}
                      readOnly={isAddressReadOnly}
                      placeholder=" "
                      className={`peer block w-full rounded-md border px-3 pt-5 pb-2 text-sm text-gray-900 focus:outline-none focus:ring-1 transition-colors ${addressPopupErrors.postalCode || pincodeServiceable === false ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "border-gray-300 focus:border-blue-600 focus:ring-blue-600"} ${isSubmitting || pincodeChecking ? "bg-gray-50 text-gray-400 cursor-not-allowed" : "bg-white"}`}
                      value={checkoutForm.postalCode}
                      onChange={async (e) => {
                        const value = e.target.value;
                        // Update postal code in checkout form
                        setCheckoutForm((prev) => ({
                          ...prev,
                          postalCode: value,
                        }));

                        // Sync postal code to selected customer address (if any)
                        if (customer && Array.isArray(customer.addresses) && customer.addresses[selectedAddressIndex]) {
                          setCustomer((prev: any) => {
                            if (!prev || !Array.isArray(prev.addresses) || !prev.addresses[selectedAddressIndex]) return prev;
                            const updated = { ...prev };
                            updated.addresses = [...updated.addresses];
                            updated.addresses[selectedAddressIndex] = {
                              ...updated.addresses[selectedAddressIndex],
                              postalCode: value,
                            };
                            return updated;
                          });
                        }

                        // Auto-populate city and state + check serviceability when a 6-digit pincode is entered
                        const digits = value.replace(/[^0-9]/g, "");
                        if (digits.length === 6) {
                          setPincodeChecking(true);
                          await populateCityAndStateFromPincode(digits);

                          // Serviceability check
                          checkPincodeServiceability(digits);
                        } else {
                          setCheckoutForm((prev) => ({
                            ...prev,
                            city: "",
                            state: "",
                          }));
                          setPincodeServiceable(null);
                        }
                      }}
                    />
                    <label
                      htmlFor="postal-code"
                      className={`pointer-events-none absolute left-2.5 -top-2.5 bg-white px-1 text-xs transition-all duration-200 peer-placeholder-shown:top-3.5 peer-placeholder-shown:left-3 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400 peer-placeholder-shown:bg-transparent peer-placeholder-shown:px-0 peer-focus:-top-2.5 peer-focus:left-2.5 peer-focus:text-xs peer-focus:bg-white peer-focus:px-1 ${addressPopupErrors.postalCode || pincodeServiceable === false ? "text-red-500 peer-focus:text-red-500" : "text-blue-600 peer-focus:text-blue-600"}`}
                    >
                      Postal Code <span className="text-red-500 ml-0.5">*</span>
                    </label>
                  </div>
                  {pincodeChecking && (
                    <p className="mt-1 text-xs text-blue-500">Checking delivery availability...</p>
                  )}
                  {!pincodeChecking && pincodeServiceable === false && (
                    <p className="mt-1 text-xs text-red-600 font-medium">
                      Sorry, delivery is not available to this pincode. Please use a different address.
                    </p>
                  )}
                  {!pincodeChecking && pincodeServiceable === true && (
                    <p className="mt-1 text-xs text-green-600 font-medium">✓ Delivery available to this pincode</p>
                  )}
                </div>

                <div>
                  <div className="relative">
                  <input
                    type="text"
                    id="city"
                    name="city"
                    autoComplete="address-level2"
                    disabled={isSubmitting}
                    readOnly
                    placeholder=" "
                    className={`peer block w-full rounded-md border px-3 pt-5 pb-2 text-sm text-gray-900 bg-gray-50 cursor-not-allowed focus:outline-none transition-colors ${addressPopupErrors.city ? "border-red-500" : "border-gray-300"}`}
                    value={checkoutForm.city}
                  />
                  <label
                    htmlFor="city"
                    className={`pointer-events-none absolute left-2.5 -top-2.5 bg-gray-50 px-1 text-xs transition-all duration-200 peer-placeholder-shown:top-3.5 peer-placeholder-shown:left-3 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400 peer-placeholder-shown:bg-transparent peer-placeholder-shown:px-0 peer-focus:-top-2.5 peer-focus:left-2.5 peer-focus:text-xs peer-focus:bg-gray-50 peer-focus:px-1 ${addressPopupErrors.city ? "text-red-500" : "text-blue-600"}`}
                  >
                    City <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  </div>
                  {addressPopupErrors.city && (
                    <p className="mt-1 text-xs text-red-500">City is required</p>
                  )}
                </div>

                <div>
                  <div className="relative">
                  <input
                    type="text"
                    id="region"
                    name="region"
                    autoComplete="address-level1"
                    disabled={isSubmitting}
                    readOnly
                    placeholder=" "
                    className={`peer block w-full rounded-md border px-3 pt-5 pb-2 text-sm text-gray-900 bg-gray-50 cursor-not-allowed focus:outline-none transition-colors ${addressPopupErrors.state ? "border-red-500" : "border-gray-300"}`}
                    value={checkoutForm.state}
                  />
                  <label
                    htmlFor="region"
                    className={`pointer-events-none absolute left-2.5 -top-2.5 bg-gray-50 px-1 text-xs transition-all duration-200 peer-placeholder-shown:top-3.5 peer-placeholder-shown:left-3 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400 peer-placeholder-shown:bg-transparent peer-placeholder-shown:px-0 peer-focus:-top-2.5 peer-focus:left-2.5 peer-focus:text-xs peer-focus:bg-gray-50 peer-focus:px-1 ${addressPopupErrors.state ? "text-red-500" : "text-blue-600"}`}
                  >
                    State <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  </div>
                  {addressPopupErrors.state && (
                    <p className="mt-1 text-xs text-red-500">State is required</p>
                  )}
                </div>

                </div>
              </div>
            </section>

            {hasSavedAddresses && (
              <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={handleCancelAddressPopup}
                  className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await handleSaveAddressChanges();
                    if (ok) {
                      setShowDetails(false);
                      setIsAddressReadOnly(true);
                    }
                  }}
                  disabled={isSubmitting}
                  className="rounded-xl bg-blue-500 hover:bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60 transition-colors shadow-sm"
                >
                  Save Address
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
      )}

        </form>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
