package pool

import (
	"context"
	"sync"
)

type Task func(ctx context.Context)

type Pool struct {
	tasks chan Task
	wg    sync.WaitGroup
}

func NewPool(size int) *Pool {
	p := &Pool{
		tasks: make(chan Task, size*2),
	}

	for i := 0; i < size; i++ {
		go p.worker()
	}

	return p
}

func (p *Pool) worker() {
	for task := range p.tasks {
		task(context.Background())
		p.wg.Done()
	}
}

func (p *Pool) Submit(task Task) {
	p.wg.Add(1)
	p.tasks <- task
}

func (p *Pool) Wait() {
	p.wg.Wait()
}

func (p *Pool) Close() {
	close(p.tasks)
}
