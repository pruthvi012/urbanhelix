import { FiCheck, FiPlay, FiClock } from 'react-icons/fi';

export default function RecentActivities({ activities }) {
    const defaultActivities = [
        { title: 'Road Repair Completed in Jayanagar', time: '2 days ago', status: 'completed' },
        { title: 'Drainage Work Started in Basavanagudi', time: '5 days ago', status: 'started' },
        { title: 'Streetlight Installation in BTM Layout', time: '1 week ago', status: 'pending' },
    ];

    const displayActivities = activities || defaultActivities;

    const getIcon = (status) => {
        switch (status) {
            case 'completed': return <FiCheck strokeWidth={3} />;
            case 'started': return <FiPlay fill="currentColor" />;
            default: return <FiClock />;
        }
    };

    const getIconColor = (status) => {
        switch (status) {
            case 'completed': return 'var(--premium-green)';
            case 'started': return 'var(--premium-blue)';
            default: return 'var(--premium-orange)';
        }
    };

    return (
        <div className="premium-card">
            <h3 className="premium-card-label" style={{ color: 'white', marginBottom: '20px' }}>Recent Activities</h3>
            <div>
                {displayActivities.map((activity, idx) => (
                    <div key={idx} className="activity-item">
                        <div className="item-icon" style={{ background: `rgba(${getIconColor(activity.status).includes('green') ? '74, 222, 128' : getIconColor(activity.status).includes('blue') ? '56, 189, 248' : '251, 146, 60'}, 0.1)`, color: getIconColor(activity.status) }}>
                            {getIcon(activity.status)}
                        </div>
                        <div className="item-content">
                            <div className="item-title">{activity.title}</div>
                            <div className="item-meta">{activity.time}</div>
                        </div>
                        <div style={{ color: 'var(--premium-green)', fontSize: '14px' }}>
                            <FiCheck />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
