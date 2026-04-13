import { register } from "@/actions/auth";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <form
        action={register}
        className="flex flex-col gap-4 w-full max-w-md p-8 border rounded-lg shadow-sm"
      >
        <h1 className="text-2xl font-bold mb-4">Register</h1>
        <input
          name="name"
          placeholder="Name (optional)"
          className="p-2 border rounded"
        />
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          className="p-2 border rounded"
        />
        <input
          name="password"
          type="password"
          placeholder="Password (min 8 chars)"
          required
          minLength={8}
          className="p-2 border rounded"
        />
        <button
          type="submit"
          className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        >
          Register
        </button>
      </form>
      <p className="mt-4">
        Already have an account?{" "}
        <Link href="/login" className="text-blue-500 underline">
          Login
        </Link>
      </p>
    </div>
  );
}
