import { signIn } from "@/lib/auth";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="flex flex-col gap-8 w-full max-w-md p-8 border rounded-lg shadow-sm">
        <form
          action={async (formData: FormData) => {
            "use server";
            await signIn("credentials", {
              email: formData.get("email"),
              password: formData.get("password"),
              redirectTo: "/lists",
            });
          }}
          className="flex flex-col gap-4"
        >
          <h1 className="text-2xl font-bold mb-4">Login</h1>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="Email"
              required
              className="mt-1 w-full p-2 border rounded"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Password"
              required
              className="mt-1 w-full p-2 border rounded"
            />
          </div>
          <button
            type="submit"
            className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
          >
            Login
          </button>
        </form>

        <div className="relative flex py-5 items-center">
          <div className="flex-grow border-t border-gray-300"></div>
          <span className="flex-shrink mx-4 text-gray-400">Or</span>
          <div className="flex-grow border-t border-gray-300"></div>
        </div>

        <form
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: "/lists" });
          }}
        >
          <button
            type="submit"
            className="w-full bg-black text-white p-2 rounded hover:bg-gray-800"
          >
            Continue with GitHub
          </button>
        </form>
      </div>
      <p className="mt-4">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-blue-500 underline">
          Register
        </Link>
      </p>
    </div>
  );
}
