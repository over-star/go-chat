import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Coins, TrendingUp, TrendingDown, Clock, Calendar, ListFilter } from 'lucide-react'
import { cn } from '../lib/utils'
import { marketService } from '../services/marketService'

const TIME_RANGES = {
    '1h': { 
        label: '分钟', 
        hours: 1, 
        icon: Clock,
        format: (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    },
    '1d': { 
        label: '小时', 
        hours: 24, 
        icon: ListFilter,
        format: (d) => {
            const date = new Date(d)
            return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:00`
        }
    },
    '1w': { 
        label: '天', 
        hours: 168, 
        icon: Calendar,
        format: (d) => {
            const date = new Date(d)
            return `${date.getMonth() + 1}/${date.getDate()}`
        }
    }
}

const Dashboard = () => {
    const [marketData, setMarketData] = useState([])
    const [history, setHistory] = useState([])
    const [timeRange, setTimeRange] = useState('1h')
    const [loading, setLoading] = useState(true)

    const fetchInitialHistory = useCallback(async (range) => {
        try {
            const config = TIME_RANGES[range]
            const goldSymbol = 'SGE-Au(T+D)'
            const silverSymbol = 'SGE-Ag(T+D)'
            
            const [goldHistory, silverHistory] = await Promise.all([
                marketService.getHistory(goldSymbol, config.hours),
                marketService.getHistory(silverSymbol, config.hours)
            ])

            const goldData = goldHistory.data || []
            const silverData = silverHistory.data || []

            const timeMap = {}
            
            const processData = (data, key) => {
                data.forEach(item => {
                    const dateObj = new Date(item.created_at)
                    const timeStr = config.format(dateObj)
                    if (!timeMap[timeStr]) {
                        timeMap[timeStr] = { 
                            time: timeStr, 
                            gold: [], 
                            silver: [], 
                            rawTime: dateObj.getTime() 
                        }
                    }
                    timeMap[timeStr][key].push(item.price)
                })
            }

            processData(goldData, 'gold')
            processData(silverData, 'silver')

            const result = Object.values(timeMap)
                .sort((a, b) => a.rawTime - b.rawTime)
                .map(item => ({
                    time: item.time,
                    gold: item.gold.length > 0 ? item.gold.reduce((a, b) => a + b, 0) / item.gold.length : 0,
                    silver: item.silver.length > 0 ? item.silver.reduce((a, b) => a + b, 0) / item.silver.length : 0
                }))

            if (result.length > 0) {
                setHistory(result)
            } else {
                const initialHistory = []
                const now = new Date()
                const step = range === '1h' ? 60000 : range === '1d' ? 3600000 : 86400000
                for (let i = 10; i >= 0; i--) {
                    const time = new Date(now.getTime() - i * step)
                    initialHistory.push({
                        time: config.format(time),
                        gold: 0,
                        silver: 0
                    })
                }
                setHistory(initialHistory)
            }
        } catch (error) {
            console.error('Failed to fetch initial history:', error)
        }
    }, [])

    useEffect(() => {
        setLoading(true)
        fetchInitialHistory(timeRange).then(() => {
            setLoading(false)
        })
    }, [timeRange, fetchInitialHistory])

    useEffect(() => {
        const fetchPrices = async () => {
            try {
                const response = await marketService.getPrices()
                if (response.data) {
                    setMarketData(response.data)
                    
                    if (timeRange === '1h') {
                        const goldData = response.data.find(p => p.symbol === 'SGE-Au(T+D)')
                        const silverData = response.data.find(p => p.symbol === 'SGE-Ag(T+D)') || response.data.find(p => p.symbol === 'WG-XAGUSD')
                        
                        if (goldData) {
                            setHistory(prev => {
                                const now = new Date()
                                const timeStr = TIME_RANGES['1h'].format(now)
                                const lastPoint = prev[prev.length - 1]
                                
                                if (lastPoint && lastPoint.time === timeStr) {
                                    const newHistory = [...prev]
                                    newHistory[newHistory.length - 1] = {
                                        ...lastPoint,
                                        gold: goldData.price,
                                        silver: silverData ? silverData.price : lastPoint.silver
                                    }
                                    return newHistory
                                } else {
                                    const newPoint = {
                                        time: timeStr,
                                        gold: goldData.price,
                                        silver: silverData ? silverData.price : 0
                                    }
                                    return [...prev.slice(1), newPoint]
                                }
                            })
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to fetch prices:', error)
            }
        }

        const interval = setInterval(fetchPrices, 10000)
        fetchPrices()
        return () => clearInterval(interval)
    }, [timeRange])

    if (loading) {
        return <div className="p-6">加载中...</div>
    }

    return (
        <div className="p-4 md:p-6 space-y-4 md:space-y-6 bg-background h-full overflow-auto">
            <h1 className="text-xl md:text-2xl font-bold mb-2 md:mb-6">行情看板</h1>
            
            <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-4">
                {marketData.map((item) => (
                    <Card key={item.symbol}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 md:p-6 pb-1 md:pb-2">
                            <CardTitle className="text-[10px] md:text-sm font-medium truncate mr-1">{item.name}</CardTitle>
                            <Coins className={cn("h-3 w-3 md:h-4 md:w-4 shrink-0", 
                                item.symbol.includes('Au') ? "text-yellow-500" : 
                                item.symbol.includes('Ag') ? "text-gray-400" : "text-blue-500"
                            )} />
                        </CardHeader>
                        <CardContent className="p-2 md:p-6 pt-0 md:pt-0">
                            <div className="text-sm md:text-xl font-bold truncate">
                                {item.unit === 'USD' ? '$' : item.unit === 'CNY' || item.unit === 'CNY/g' ? '¥' : ''}
                                {item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                                <span className="hidden md:inline text-[10px] ml-1 font-normal text-muted-foreground">{item.unit}</span>
                            </div>
                            <p className={`text-[8px] md:text-xs flex items-center mt-0.5 md:mt-1 ${item.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {item.change >= 0 ? <TrendingUp className="h-2 w-2 md:h-3 md:w-3 mr-0.5 md:mr-1" /> : <TrendingDown className="h-2 w-2 md:h-3 md:w-3 mr-0.5 md:mr-1" />}
                                {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)} 
                                <span className="hidden sm:inline ml-1">({item.change_percent.toFixed(2)}%)</span>
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Price Chart for Gold/Silver */}
            <Card className="w-full">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0 pb-4">
                    <div>
                        <CardTitle className="text-base md:text-lg">黄金/白银走势 (实时数据)</CardTitle>
                        <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                            当前视图: 按{TIME_RANGES[timeRange].label}展示
                        </p>
                    </div>
                    <div className="flex bg-muted p-1 rounded-lg w-full sm:w-auto overflow-x-auto">
                        {Object.entries(TIME_RANGES).map(([key, config]) => {
                            const Icon = config.icon
                            return (
                                <Button
                                    key={key}
                                    variant={timeRange === key ? "secondary" : "ghost"}
                                    size="sm"
                                    className={cn(
                                        "h-8 px-3 text-xs gap-1.5",
                                        timeRange === key && "bg-background shadow-sm"
                                    )}
                                    onClick={() => setTimeRange(key)}
                                >
                                    <Icon className="h-3.5 w-3.5" />
                                    {config.label}
                                </Button>
                            )
                        })}
                    </div>
                </CardHeader>
                <CardContent className="h-[300px] md:h-[400px] px-2 md:px-6">
                    {loading ? (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                            加载中...
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={history} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis 
                                dataKey="time" 
                                fontSize={10} 
                                tickLine={false} 
                                axisLine={false}
                                minTickGap={20}
                            />
                            <YAxis 
                                yAxisId="left" 
                                domain={['auto', 'auto']} 
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => val.toFixed(1)}
                            />
                            <YAxis 
                                yAxisId="right" 
                                orientation="right" 
                                domain={['auto', 'auto']}
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => val.toFixed(1)}
                            />
                            <Tooltip 
                                contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
                                itemStyle={{ padding: '2px 0' }}
                            />
                            <Line 
                                yAxisId="left"
                                type="monotone" 
                                dataKey="gold" 
                                stroke="#eab308" 
                                name="黄金" 
                                dot={false}
                                strokeWidth={2}
                            />
                            <Line 
                                yAxisId="right"
                                type="monotone" 
                                dataKey="silver" 
                                stroke="#9ca3af" 
                                name="白银" 
                                dot={false}
                                strokeWidth={2}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
                </CardContent>
            </Card>
        </div>
    )
}

export default Dashboard
