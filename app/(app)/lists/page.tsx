import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getListsWithStats } from '@/actions/lists';
import ListCard from '@/components/list-card';
import ListForm from '@/components/list-form';

export default async function ListsPage() {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }

  const lists = await getListsWithStats();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Lists</h1>
        <ListForm />
      </div>

      {lists.length === 0 ? (
        <p className="text-center text-gray-500 py-12">No lists yet</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {lists.map((list) => (
            <ListCard 
              key={list.id} 
              id={list.id} 
              name={list.name} 
              taskCount={list.taskCount} 
              dueSoonCount={list.dueSoonCount} 
            />
          ))}
        </div>
      )}
    </div>
  );
}
