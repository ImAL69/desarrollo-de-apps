import { HttpClient } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';

interface Episode {
  id: number;
  name: string;
  air_date: string;
  episode: string;
  characters: string[];
}

interface EpisodeApiResponse {
  info: {
    next: string | null;
  };
  results: Episode[];
}

@Component({
  selector: 'app-episodes-page',
  standalone: true,
  templateUrl: './episodes-page.html',
  styleUrl: './episodes-page.css'
})
export class EpisodesPageComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'https://rickandmortyapi.com/api/episode';

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly episodes = signal<Episode[]>([]);
  protected readonly selectedSeason = signal<string>('all');
  protected readonly selectedEpisodeId = signal<number | null>(null);
  protected readonly seasons = computed(() => {
    const seasonNumbers = new Set<number>();

    for (const episode of this.episodes()) {
      const season = this.getSeasonNumber(episode.episode);
      if (season !== null) {
        seasonNumbers.add(season);
      }
    }

    return Array.from(seasonNumbers).sort((a, b) => a - b);
  });
  protected readonly filteredEpisodes = computed(() => {
    const season = this.selectedSeason();
    if (season === 'all') {
      return this.episodes();
    }

    return this.episodes().filter(
      (episode) => this.getSeasonNumber(episode.episode)?.toString() === season
    );
  });
  protected readonly selectedEpisode = computed(() => {
    const episodeId = this.selectedEpisodeId();
    if (episodeId === null) {
      return null;
    }

    return this.episodes().find((episode) => episode.id === episodeId) ?? null;
  });

  ngOnInit(): void {
    this.fetchEpisodes(this.apiUrl, []);
  }

  protected onSeasonChange(event: Event): void {
    const season = (event.target as HTMLSelectElement).value;
    this.selectedSeason.set(season);
    this.ensureSelectedEpisode();
  }

  protected selectEpisode(episodeId: number): void {
    this.selectedEpisodeId.set(episodeId);
  }

  private fetchEpisodes(url: string, accumulatedEpisodes: Episode[]): void {
    this.http.get<EpisodeApiResponse>(url).subscribe({
      next: (response) => {
        const allEpisodes = [...accumulatedEpisodes, ...response.results];

        if (response.info.next) {
          this.fetchEpisodes(response.info.next, allEpisodes);
          return;
        }

        this.episodes.set(allEpisodes);
        this.ensureSelectedEpisode();
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los episodios.');
        this.loading.set(false);
      }
    });
  }

  private ensureSelectedEpisode(): void {
    const filteredEpisodes = this.filteredEpisodes();

    if (filteredEpisodes.length === 0) {
      this.selectedEpisodeId.set(null);
      return;
    }

    const selectedEpisodeId = this.selectedEpisodeId();
    const selectedEpisodeExists = filteredEpisodes.some(
      (episode) => episode.id === selectedEpisodeId
    );

    if (!selectedEpisodeExists) {
      this.selectedEpisodeId.set(filteredEpisodes[0].id);
    }
  }

  private getSeasonNumber(episodeCode: string): number | null {
    const seasonMatch = /S(\d+)E\d+/i.exec(episodeCode);
    if (!seasonMatch) {
      return null;
    }

    return Number(seasonMatch[1]);
  }
}
