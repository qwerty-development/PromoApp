import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

type Role = 'user' | 'seller' | 'admin' | null

export function useAuth() {
	const [user, setUser] = useState<User | null>(null)
	const [role, setRole] = useState<Role>(null)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		// Initial session check
		supabase.auth.getSession().then(({ data: { session } }) => {
			if (session?.user) {
				setUser(session.user)
				fetchUserRole(session.user.id)
			} else {
				setUser(null)
				setRole(null)
				setLoading(false)
			}
		})

		const { data: authListener } = supabase.auth.onAuthStateChange(
			async (event, session) => {
				console.log('Auth state change:', event, session?.user?.id)

				switch (event) {
					case 'USER_UPDATED':
						// Don't modify the session for password updates
						break

					case 'SIGNED_OUT':
						setUser(null)
						setRole(null)
						break

					case 'SIGNED_IN':
					case 'INITIAL_SESSION':
						if (session?.user) {
							setUser(session.user)
							await fetchUserRole(session.user.id)
						}
						break

					default:
						break
				}

				setLoading(false)
			}
		)

		return () => {
			authListener.subscription.unsubscribe()
		}
	}, [])

	const fetchUserRole = async (userId: string) => {
		try {
			const { data, error } = await supabase
				.from('users')
				.select('role')
				.eq('id', userId)
				.single()

			if (error) {
				console.error('Error fetching user role:', error)
				setRole(null)
			} else {
				setRole(data.role as Role)
			}
		} catch (error) {
			console.error('Error in fetchUserRole:', error)
			setRole(null)
		}
	}
	return { user, role, loading }
}
