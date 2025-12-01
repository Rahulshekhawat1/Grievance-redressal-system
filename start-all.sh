echo "Start backend:"
(cd backend && npm run dev) &
echo "Start frontend:"
(cd frontend && npm run dev) &
wait
