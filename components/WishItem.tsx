"use client";
import { useWishlistStore } from "@/app/_zustand/wishlistStore";
import { deleteWishItem } from "@/app/actions";
import Link from "next/link";
import React from "react";
import { FaTrash } from "react-icons/fa6";

interface WishItemProps {
  id: string;
  title: string;
  price: number;
  image: string;
  slug: string;
  stockAvailabillity: number;
}

const WishItem = ({ id, title, price, image, slug, stockAvailabillity }: WishItemProps) => {
  const { removeFromWishlist } = useWishlistStore();

  const handleDelete = async () => {
    removeFromWishlist(id);
    await deleteWishItem(id);
  };

  return (
    <tr>
      <td></td>
      <td>
        <Link href={`/product/${slug}`}>
          <img src={image} alt={title} className="w-16 h-16 object-cover rounded" />
        </Link>
      </td>
      <td>
        <Link href={`/product/${slug}`} className="hover:underline text-black">
          {title}
        </Link>
        <div className="text-sm text-gray-500">₹{price}</div>
      </td>
      <td>
        <span className={stockAvailabillity > 0 ? "text-green-600" : "text-red-500"}>
          {stockAvailabillity > 0 ? "In Stock" : "Out of Stock"}
        </span>
      </td>
      <td>
        <button
          onClick={handleDelete}
          className="btn btn-sm btn-error text-white"
          aria-label="Remove from wishlist"
        >
          <FaTrash />
        </button>
      </td>
    </tr>
  );
};

export default WishItem;
