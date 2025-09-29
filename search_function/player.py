
def menu(sonic_hub):
    while True:
        print("\nChoose an action:")
        print("> Search Albums")
        print("> Search Artists")
        print("> Search Songs") 
        print("> Exit")

        choice = input("> > Enter 'Albums', 'Artists', or 'Songs': ")

        if choice == 'Albums'.title() or 'Album'.title():
             album_title = input("Enter album title to search: ")
             albums = sonic_hub.get_albums_by_title(album_title)
             if albums:
                print(f"\tFound {len(albums)}")
                for album in albums:
                    print('\t',album)
                    print(f"\t\tListen here: {album.url}")
             else:
                print("No albums not found.")
        elif choice == 'artists'.title() or 'artist'.title():
            artist_name = input("Enter artist name to search: ")
            artists = sonic_hub.get_artists_by_name(artist_name)
            if artists:
                print(f"\tFound {len(artists)}")
                for artist in artists:
                    print('\t',artist)
                    print(f"\t\tListen here: {artist.url}")
            else:
                print("No artists not found.")
        elif choice == 'songs'.title() or 'song'.title():
             track_title = input("Enter track title to search: ")
             tracks = sonic_hub.get_tracks_by_title(track_title)
             if tracks:
                print(f"\tFound {len(tracks)}")
                for track in tracks:
                    print('\t',track)
                    print(f"\t\tListen here: {track.url}")
             else:
                print("No tracks not found.")
        elif choice == 'exit'.lower():
            print("Exiting program.")
            break
        else:
            print("Invalid choice. Please try again.")


if __name__ == "__main__":
    menu('sonic_hub')
