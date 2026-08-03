import { redirect } from "next/navigation";

export default function Home() {
  redirect("/search?price=10000&minPrice=0&inStock=false&sort=lowPrice&page=1");
}
