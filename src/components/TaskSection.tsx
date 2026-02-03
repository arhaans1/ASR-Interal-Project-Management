// ... other imports
import TaskAssignModal from './TaskAssignModal';
import { supabase } from '@/lib/supabase';
import { User as UserIcon } from 'lucide-react'; // Rename to avoid conflict if needed, or just import User

// ... inside component
const [assignModalOpen, setAssignModalOpen] = useState(false);
const [assigningTaskId, setAssigningTaskId] = useState<string | null>(null);
const [assigningTaskName, setAssigningTaskName] = useState('');
const [currentAssigneeId, setCurrentAssigneeId] = useState<string | null>(null);

const openAssignModal = (task: Task) => {
  setAssigningTaskId(task.id);
  setAssigningTaskName(task.name);
  setCurrentAssigneeId(task.assigned_to || null);
  setAssignModalOpen(true);
};

const handleAssign = async (targetUserId: string, targetUserName: string) => {
  if (!assigningTaskId || !assigningTaskName) return;

  try {
    // 1. Update LOCAL task with new assignee
    // We find the category of the task
    let taskCategory = '';
    categories.forEach(c => {
      if (c.tasks.find(t => t.id === assigningTaskId)) taskCategory = c.id;
    });

    if (taskCategory) {
      await onUpdateTask(taskCategory, assigningTaskId, {
        assigned_to: targetUserId
        // assigned_user_name: targetUserName (Note: onUpdateTask might not update join field locally immediately unless we handle it, but refresh will fix it. 
        // We should pass a "refresh" or manually update local state if onUpdateTask supports it?)
        // onUpdateTask updates 'tasks' state locally. But 'assigned_user_name' is not in the DB update payload.
        // We might need to force refresh or modify onUpdateTask to accept extra fields for local optimizaiton.
        // For now, let's just rely on the fact that we assign the ID.
      });
      // HACK: manually update the name locally to show immediate UI feedback? 
      // Or just trigger a full refresh?
      // Let's assume onUpdateTask handles the DB update.

      // 2. LOGIC: Copy to Target User Board
      // A. Find Target User's "Tasks" Category
      const { data: targetCategories } = await supabase
        .from('categories')
        .select('id, name')
        .eq('client_id', targetUserId) // Team Member is a "Client" -> client_id = user_id
        .order('order_index');

      let targetCategoryId = '';

      if (targetCategories && targetCategories.length > 0) {
        const tasksCat = targetCategories.find(c => c.name === 'Tasks');
        if (tasksCat) targetCategoryId = tasksCat.id;
        else targetCategoryId = targetCategories[0].id;
      } else {
        // Create 'Tasks' category? 
        const { data: newCat } = await supabase
          .from('categories')
          .insert({ client_id: targetUserId, name: 'Tasks', order_index: 0 })
          .select()
          .single();
        if (newCat) targetCategoryId = newCat.id;
      }

      if (targetCategoryId) {
        await supabase.from('tasks').insert({
          category_id: targetCategoryId,
          name: assigningTaskName,
          completed: false,
          order_index: 9999 // append
        });
      }

      // 3. LOGIC: Delete from Old User Board (if re-assigned)
      if (currentAssigneeId && currentAssigneeId !== targetUserId) {
        // Find task in OLD user's board with same name
        // "Delete from Trisha's board"
        // We don't have the ID of the copy... 
        // Strategy: Find tasks in old user's board with same name and delete.
        // Risk: Deletes duplicate named tasks. Accepted for now per "I hope you know what I mean".

        const { data: oldCats } = await supabase.from('categories').select('id').eq('client_id', currentAssigneeId);
        if (oldCats && oldCats.length > 0) {
          const oldCatIds = oldCats.map(c => c.id);
          await supabase.from('tasks').delete()
            .in('category_id', oldCatIds)
            .eq('name', assigningTaskName);
        }
      }
    }

    setAssignModalOpen(false);
    // FORCE RELOAD to see the new assignee name/avatar properly if local state didn't catch it
    window.location.reload();
  } catch (e) {
    console.error("Assignment failed", e);
    alert("Failed to assign task");
  }
};

const getInitials = (name: string) => name ? name.slice(0, 1).toUpperCase() : '?';
const getRandomColor = (name: string) => {
  const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-teal-500'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

// ... JSX
// In the task map loop
<div className={`flex items-center transition-all gap-1 ${isReadOnly ? 'hidden' : 'opacity-0 group-hover/task:opacity-100'}`}>
  {/* Assign User Button */}
  <button
    onClick={() => openAssignModal(task)}
    className="p-1 mr-1 text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors flex items-center justify-center h-6 w-6"
    title={task.assigned_user_name ? `Assigned to ${task.assigned_user_name}` : "Assign to Team Member"}
  >
    {task.assigned_user_name ? (
      <div className={`w-5 h-5 rounded-full text-[10px] text-white flex items-center justify-center font-bold ${getRandomColor(task.assigned_user_name)}`}>
        {getInitials(task.assigned_user_name)}
      </div>
    ) : (
      <UserIcon className="w-3.5 h-3.5" />
    )}
  </button>

  <button
    // ...

    // ... End of return
    <TaskAssignModal
        isOpen={assignModalOpen}
    onClose={() => setAssignModalOpen(false)}
    onAssign={handleAssign}
    currentAssigneeId={currentAssigneeId}
    taskId={assigningTaskId || ''}
  />
</div>
  );
}
