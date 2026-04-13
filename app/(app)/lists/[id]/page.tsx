import { getAuth, getListWithTasks } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import TaskForm from '@/components/task-form'
import TaskItem from '@/components/task-item'

export default async function ListPage({ params }: { params: { id: string } }) {
  const user = await getAuth()
  if (!user) redirect('/login')

  const list = await getListWithTasks(params.id)
  if (!list) redirect('/lists')

  const pendingTasks = list.tasks.filter(t => !t.done)
  const doneTasks = list.tasks.filter(t => t.done)

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{list.name}</h1>
        <Link href={`/lists/${params.id}/settings`} className="text-blue-500 underline">
          Settings
        </Link>
      </div>

      <TaskForm listId={params.id} />

      <div className="space-y-2">
        {pendingTasks.map(task => (
          <TaskItem key={task.id} task={task} />
        ))}
      </div>

      {doneTasks.length > 0 && (
        <>
          <hr className="my-6" />
          <div className="space-y-2">
            {doneTasks.map(task => (
              <TaskItem key={task.id} task={task} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
