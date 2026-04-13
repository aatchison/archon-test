import { getAuth, getList } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { renameList, deleteList } from '@/actions/lists'

export default async function ListSettingsPage({ params }: { params: { id: string } }) {
  const user = await getAuth()
  if (!user) redirect('/login')

  const list = await getList(params.id)
  if (!list || list.userId !== user.id) redirect('/lists')

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">List Settings</h1>

      <form action={async (formData) => {
        'use server'
        const name = formData.get('name') as string
        await renameList(params.id, name)
      }} className="mb-8">
        <div className="flex gap-2">
          <input
            name="name"
            defaultValue={list.name}
            className="flex-1 border p-2 rounded"
          />
          <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
            Rename
          </button>
        </div>
      </form>

      <form action={async () => {
        'use server'
        await deleteList(params.id)
        redirect('/lists')
      }}>
        <button className="bg-red-500 text-white px-4 py-2 rounded">
          Delete List
        </button>
      </form>
    </div>
  )
}
